const fs = require("fs");
const path = require("path");
const glob = require("glob");
const { spawnSync } = require("child_process");

const spawnOpts = { shell: true, stdio: "inherit", windowsHide: true };

exports.publish = function (artifactsPath, s3Bucket, awsProxy) {
  if (awsProxy) {
    fs.appendFileSync('/etc/hosts', `${awsProxy.replace(' ', '\t')}\n`);
    console.log('$ cat /etc/hosts');
    spawnSync("cat", ["/etc/hosts"], spawnOpts);
  }
  glob.sync(path.join(artifactsPath, "*")).map(artifactPath => {
    glob.sync(path.join(artifactPath, "*", "build", "stage", "*")).forEach(prebuiltPath => {
      const name = path.basename(prebuiltPath);
      const aws_args = [
        "s3", "sync", prebuiltPath, `s3://${s3Bucket}/${name}`,
        "--acl", "public-read", "--only-show-errors"
      ];
      console.log(`$ aws ${aws_args.join(' ')}`);
      spawnSync("aws", aws_args, spawnOpts);
    });
  });
  console.log('$ aws s3 ls kungfu-prebuilt');
  spawnSync("aws", ["s3", "ls", "--recursive", "--human-readable", s3Bucket], spawnOpts);
  spawnSync("aws", ["s3", "rm", "--recursive", `s3://${s3Bucket}/core`], spawnOpts);
};