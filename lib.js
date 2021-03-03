const fs = require("fs");
const path = require("path");
const glob = require("glob");
const readline = require('readline');
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

  glob.sync(path.join(artifactsPath, "**", "build", "stage", "*")).forEach(prebuiltPath => {
    const name = path.basename(prebuiltPath);
    const aws_args = [
      "s3", "sync", prebuiltPath, `s3://${bucketPrebuilt}/${name}`,
      "--acl", "public-read", "--only-show-errors"
    ];
    console.log(`$ aws ${aws_args.join(' ')}`);
    spawnSync("aws", aws_args, spawnOptsInherit);
  });

  spawnSync("ls", ["-R", artifactsPath], spawnOptsInherit);

  glob.sync(path.join(artifactsPath, "**", "build", "app", "*")).forEach(appPath => {
    const name = path.basename(appPath);
    const version = semver.parse(name.slice(name.indexOf('-') + 1));
    if (version) {
      const versionPath = `v${version.major}/v${version.major}.${version.minor}.${version.patch}`;
      const aws_args = [
        "s3", "sync", appPath, `s3://${bucketApp}/${versionPath}/${name}`,
        "--acl", "public-read", "--only-show-errors"
      ];
      console.log(`$ aws ${aws_args.join(' ')}`);
      spawnSync("aws", aws_args, spawnOptsInherit);
    }
  });
};