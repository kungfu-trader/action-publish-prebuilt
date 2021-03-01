const fs = require("fs");
const path = require("path");
const glob = require("glob");
const { spawnSync } = require("child_process");

const spawnOpts = { shell: true, stdio: "inherit", windowsHide: true };

exports.publish = function (artifactsPath, awsProxy) {
  if (awsProxy) {
    fs.appendFileSync('/etc/hosts', `${awsProxy}\n`);
    spawnSync("cat", ["/etc/hosts"], spawnOpts);
    spawnSync("traceroute", ["kungfu-prebuilt.s3.cn-northwest-1.amazonaws.com.cn"], spawnOpts);
    console.log('---');
  }
  glob.sync(path.join(artifactsPath, "*")).map(artifactPath => {
    glob.sync(path.join(artifactPath, "*", "build", "stage", "*")).forEach(prebuiltPath => {
      const name = path.basename(prebuiltPath);
      const aws_args = ["s3", "sync", prebuiltPath, `s3://kungfu-prebuilt/${name}`, "--acl", "public-read", "--only-show-errors"];
      console.log(`$ aws ${aws_args.join(' ')}`);
      spawnSync("aws", aws_args, spawnOpts);
    });
  });
  console.log('$ aws s3 ls');
  spawnSync("aws", ["s3", "ls", "--recursive", "kungfu-prebuilt"], spawnOpts);
};