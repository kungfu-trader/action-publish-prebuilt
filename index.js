/* eslint-disable no-restricted-globals */
const lib = (exports.lib = require('./lib.js'));
const core = require('@actions/core');
const github = require('@actions/github');

const main = async function () {
  const context = github.context;
  const token = core.getInput('token');
  const awsProxy = core.getInput('aws-proxy');
  const artifactsPath = core.getInput('artifacts-path');
  const bucketStaging = core.getInput('bucket-staging');
  const bucketRelease = core.getInput('bucket-release');
  const withComment = core.getInput('no-comment') === 'false';
  const repo = github.context.repo;
  const pullRequestNumber = () => (context.issue.number ? context.issue.number : context.payload.pull_request.number);

  if (awsProxy) {
    lib.setupProxy(awsProxy);
  }

  const addComment = async () => {
    if (withComment) {
      await lib
        .addPreviewComment(token, repo.owner, repo.repo, pullRequestNumber(), bucketStaging)
        .catch(console.error);
    }
  };

  const deleteComment = async () => {
    if (withComment) {
      await lib
        .deletePreviewComment(token, repo.owner, repo.repo, pullRequestNumber(), bucketStaging)
        .catch(console.error);
    }
  };

  if (artifactsPath && bucketStaging) {
    await deleteComment();
    lib.clean(repo.repo, bucketStaging);
    lib.stage(repo.repo, artifactsPath, bucketStaging);
    await addComment();
  }

  if (bucketStaging && bucketRelease) {
    lib.publish(repo.repo, bucketStaging, bucketRelease);
    lib.clean(repo.repo, bucketStaging);
    await deleteComment();
  }
};

if (process.env.GITHUB_ACTION) {
  main().catch((error) => {
    console.error(error);
    core.setFailed(error.message);
  });
}
