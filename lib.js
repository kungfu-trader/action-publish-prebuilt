const fs = require("fs");
const path = require("path");
const glob = require("glob");
const md5 = require("md5-file");
const os = require("os");
const semver = require("semver");
const { spawnSync } = require("child_process");

const spawnOptsInherit = { shell: true, stdio: "inherit", windowsHide: true };
const spawnOptsPipe = { shell: true, stdio: "pipe", windowsHide: true };

function currentVersion() {
  const configPath = fs.existsSync("lerna.json") ? "lerna.json" : "package.json";
  const config = JSON.parse(fs.readFileSync(configPath));
  return semver.parse(config.version);
}

function stagingArea(repo) {
  return `${repo}/${currentVersion()}`;
}

function awsCall(args, opts = spawnOptsInherit) {
  console.log(`$ aws ${args.join(' ')}`);
  const result = spawnSync("aws", args, opts);
  if (result.status !== 0) {
    throw new Error(`Failed to call aws with status ${result.status}`);
  }
}

exports.setupProxy = function (awsProxy) {
  const hostsFile = "/etc/hosts";
  const markBegin = "# AWS PROXY BEGIN #";
  const markEnd = "# AWS PROXY END #";
  const hostProxy = awsProxy.replace(' ', '\t');
  const result = spawnSync("cat", ["/etc/hosts"], spawnOptsPipe);
  const hosts = result.output.filter(e => e && e.length > 0).pop().toString().split(os.EOL);
  if (hosts.includes(markBegin) && hosts.includes(markEnd)) {
    const beginIndex = hosts.indexOf(markBegin);
    const endIndex = hosts.indexOf(markEnd);
    hosts.splice(beginIndex, endIndex - beginIndex + 1);
    fs.writeFileSync(hostsFile, hosts.join(os.EOL));
  }
  fs.appendFileSync(hostsFile, `${markBegin}${os.EOL}${hostProxy}${os.EOL}${markEnd}${os.EOL}`);
};

exports.clean = function (repo, bucketStaging) {
  awsCall(["s3", "rm", `s3://${bucketStaging}/${stagingArea(repo)}`, "--recursive", "--only-show-errors"]);
};

exports.stage = function (repo, artifactsPath, bucketStaging) {
  glob.sync(path.join(artifactsPath, "**")).forEach(filePath => {
    const suffix = ".md5-checksum";
    const stat = fs.lstatSync(filePath);
    if (stat.isFile() && !filePath.endsWith(suffix)) {
      const hash = md5.sync(filePath);
      fs.writeFileSync(filePath + suffix, `${hash}${os.EOL}`);
    }
  });
  glob.sync(path.join(artifactsPath, "**", "build", "stage", "*")).forEach(productPath => {
    const productName = path.basename(productPath);
    awsCall([
      "s3", "sync", productPath, `s3://${bucketStaging}/${stagingArea(repo)}/${productName}`,
      "--acl", "public-read", "--only-show-errors"
    ]);
  });
};

exports.publish = function (repo, bucketStaging, bucketRelease) {
  awsCall([
    "s3", "sync", `s3://${bucketStaging}/${stagingArea(repo)}`, `s3://${bucketRelease}`,
    "--acl", "public-read", "--only-show-errors"
  ]);
};