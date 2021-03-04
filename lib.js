const fs = require("fs");
const path = require("path");
const glob = require("glob");
const md5File = require('md5-file');
const semver = require('semver');
const { spawn, spawnSync } = require("child_process");

const spawnOptsInherit = { shell: true, stdio: "inherit", windowsHide: true };
const spawnOptsPipe = { shell: true, stdio: "pipe", windowsHide: true };

exports.publish = function (artifactsPath, awsProxy, bucketPrebuilt, bucketApp) {
  const hostsFile = "/etc/hosts";
  if (awsProxy) {
    const markBegin = "# AWS PROXY BEGIN #";
    const markEnd = "# AWS PROXY END #";
    const hostProxy = awsProxy.replace(' ', '\t');
    const result = spawnSync("cat", ["/etc/hosts"], spawnOptsPipe);
    const hosts = result.output.filter(e => e && e.length > 0).pop().toString().split('\n');
    if (hosts.includes(markBegin) && hosts.includes(markEnd)) {
      const beginIndex = hosts.indexOf(markBegin);
      const endIndex = hosts.indexOf(markEnd);
      hosts.splice(beginIndex, endIndex - beginIndex + 1);
      fs.writeFileSync(hostsFile, hosts.join('\n'));
    }
    fs.appendFileSync(hostsFile, `${markBegin}\n${hostProxy}\n${markEnd}\n`);
  }

  glob.sync(path.join(artifactsPath, "**")).forEach(filePath => {
    const suffix = ".md5-checksum";
    const stat = fs.lstatSync(filePath);
    if (stat.isFile() && !filePath.endsWith(suffix)) {
      const hash = md5File.sync(filePath);
      fs.writeFileSync(filePath + suffix, `${hash}\n`);
    }
  });

  glob.sync(path.join(artifactsPath, "**", "build", "stage", "*")).forEach(prebuiltPath => {
    const name = path.basename(prebuiltPath);
    const aws_args = [
      "s3", "sync", prebuiltPath, `s3://${bucketPrebuilt}/${name}`,
      "--acl", "public-read", "--only-show-errors"
    ];
    console.log(`$ aws ${aws_args.join(' ')}`);
    spawnSync("aws", aws_args, spawnOptsInherit);
  });

  glob.sync(path.join(artifactsPath, "**", "build", "app", "*")).forEach(appPath => {
    const stat = fs.lstatSync(appPath);
    if (!stat.isFile()) {
      return;
    }
    const fileName = path.basename(appPath);
    const dashIndex = fileName.indexOf('-');
    const productName = fileName.slice(0, dashIndex);
    const versionInfo = fileName.slice(dashIndex + 1);
    const version = semver.coerce(versionInfo.slice(0, versionInfo.indexOf('-')));
    if (version) {
      const aws_args = [
        "s3", "cp", appPath, `s3://${bucketApp}/${productName}/v${version.major}/v${version}/${fileName}`,
        "--acl", "public-read", "--only-show-errors"
      ];
      console.log(`$ aws ${aws_args.join(' ')}`);
      spawnSync("aws", aws_args, spawnOptsInherit);
    } else {
      console.error(`> ${appPath} does not has valid version`);
    }
  });
};