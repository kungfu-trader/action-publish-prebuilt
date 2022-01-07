/* eslint-disable no-restricted-globals */
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const md5 = require('md5-file');
const os = require('os');
const semver = require('semver');
const { spawnSync } = require('child_process');

const spawnOptsInherit = { shell: true, stdio: 'inherit', windowsHide: true };
const spawnOptsPipe = { shell: true, stdio: 'pipe', windowsHide: true };

const previewCommentTitle = '<b>Preview Download Links</b>';

function currentVersion() {
  const configPath = fs.existsSync('lerna.json') ? 'lerna.json' : 'package.json';
  const config = JSON.parse(fs.readFileSync(configPath));
  return semver.parse(config.version);
}

function stagingArea(repo) {
  return `${repo}/${currentVersion()}`;
}

function awsCall(args, opts = spawnOptsInherit) {
  console.log(`$ aws ${args.join(' ')}`);
  const result = spawnSync('aws', args, opts);
  if (result.status !== 0) {
    throw new Error(`Failed to call aws with status ${result.status}`);
  }
  return result;
}

function awsOutput(args) {
  const result = awsCall(args, spawnOptsPipe);
  return result.output
    .filter((e) => e && e.length > 0)
    .toString()
    .trimEnd();
}

exports.setupProxy = function (awsProxy) {
  const hostsFile = '/etc/hosts';
  const markBegin = '# AWS PROXY BEGIN #';
  const markEnd = '# AWS PROXY END #';
  const hostProxy = awsProxy.replace(' ', '\t');
  const result = spawnSync('cat', ['/etc/hosts'], spawnOptsPipe);
  const hosts = result.output
    .filter((e) => e && e.length > 0)
    .pop()
    .toString()
    .split(os.EOL);
  if (hosts.includes(markBegin) && hosts.includes(markEnd)) {
    const beginIndex = hosts.indexOf(markBegin);
    const endIndex = hosts.indexOf(markEnd);
    hosts.splice(beginIndex, endIndex - beginIndex + 1);
    fs.writeFileSync(hostsFile, hosts.join(os.EOL));
  }
  fs.appendFileSync(hostsFile, `${markBegin}${os.EOL}${hostProxy}${os.EOL}${markEnd}${os.EOL}`);
};

exports.clean = function (repo, bucketStaging) {
  awsCall(['s3', 'rm', `s3://${bucketStaging}/${stagingArea(repo)}`, '--recursive', '--only-show-errors']);
};

exports.digest = function (repo, artifactsPath) {
  glob.sync(path.join(artifactsPath, '**')).forEach((filePath) => {
    const suffix = '.md5-checksum';
    const stat = fs.lstatSync(filePath);
    if (stat.isFile() && !filePath.endsWith(suffix)) {
      const hash = md5.sync(filePath);
      fs.writeFileSync(filePath + suffix, `${hash}${os.EOL}`);
    }
  });
};

exports.stage = function (repo, artifactsPath, bucketStaging) {
  glob.sync(path.join(artifactsPath, '**', 'build', 'stage', '*')).forEach((source) => {
    const productName = path.basename(source);
    const dest = `s3://${bucketStaging}/${stagingArea(repo)}/${productName}`;
    awsCall(['s3', 'sync', source, dest, '--acl', 'public-read', '--only-show-errors']);
  });
};

exports.publish = function (repo, bucketStaging, bucketRelease) {
  const source = `s3://${bucketStaging}/${stagingArea(repo)}`;
  const dest = `s3://${bucketRelease}`;
  awsCall(['s3', 'sync', source, dest, '--acl', 'public-read', '--only-show-errors']);
};

exports.addPreviewComment = async function (token, owner, repo, pullRequestNumber, bucket, maxPreviewLinks = 32) {
  const context = github.context;
  const octokit = github.getOctokit(token);
  const pullRequestQuery = await octokit.graphql(`
    query {
      repository(name: "${repo}", owner: "${owner}") {
        pullRequest(number: ${pullRequestNumber}) { id }
      }
  }`);
  const pullRequestId = pullRequestQuery.repository.pullRequest.id;
  const s3Location = awsOutput(['s3api', 'get-bucket-location', '--bucket', bucket, '--output', 'text']);
  const s3BaseUrl = s3Location.startsWith('cn')
    ? `https://${bucket}.s3.${s3Location}.amazonaws.com.cn/`
    : `https://${bucket}.s3.amazonaws.com/`;
  const s3Objects = awsOutput([
    's3api',
    'list-objects-v2',
    '--bucket',
    bucket,
    '--prefix',
    stagingArea(repo),
    '--query',
    '"Contents[].[Key]"',
    '--output',
    'text',
  ]);
  const links = s3Objects
    .split(os.EOL)
    .sort()
    .filter((obj) => !obj.startsWith('.') && !obj.endsWith('.md5-checksum') && !obj.endsWith('.blockmap'))
    .slice(0, maxPreviewLinks)
    .map((obj) => `<li><a href='${s3BaseUrl}${obj}'>${path.basename(obj)}</a></li>`)
    .join(os.EOL);
  const body = `${previewCommentTitle} - [${s3Location}]${os.EOL}<ul>${os.EOL}${links}${os.EOL}</ul>`;
  await octokit.graphql(`mutation{addComment(input:{subjectId:"${pullRequestId}",body:"${body}"}){subject{id}}}`);
};

exports.deletePreviewComment = async function (token, owner, repo, pullRequestNumber) {
  const octokit = github.getOctokit(token);
  const pullRequestQuery = await octokit.graphql(`
    query {
      repository(name: "${repo}", owner: "${owner}") {
        pullRequest(number: ${pullRequestNumber}) {
          id
          comments(last:100) {
            nodes {
              id
              body
            }
          }
        }
      }
  }`);
  for (const comment of pullRequestQuery.repository.pullRequest.comments.nodes) {
    if (comment.body.startsWith(previewCommentTitle)) {
      console.log(`> delete comment ${comment.id}`);
      await octokit.graphql(`mutation{deleteIssueComment(input:{id:"${comment.id}"}){clientMutationId}}`);
    }
  }
};
