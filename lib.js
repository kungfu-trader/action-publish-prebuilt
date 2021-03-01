const fs = require("fs");
const path = require("path");
const glob = require("glob");
const { spawnSync } = require("child_process");

const spawnOpts = { shell: true, stdio: "inherit", windowsHide: true };

exports.publish = function (artifactsPath) {
  glob.sync(path.join(artifactsPath, "*")).map(artifactPath => {
    console.log(`artifact: ${artifactPath}`);
    fs.readdirSync(artifactPath).forEach(file => {
      const artifactFile = path.resolve(path.join(artifactPath, file));
      const stat = fs.lstatSync(artifactFile);
      console.log(`\t${artifactFile} size=${stat.size}`);
    });
  });
  console.log('---');
  fs.appendFileSync('/etc/hosts', '127.0.0.1 local-test-kungfu\n');
  spawnSync("cat", ["/etc/hosts"], spawnOpts);
  spawnSync("traceroute", ["kungfu-prebuilt.s3.cn-northwest-1.amazonaws.com.cn"], spawnOpts);
  console.log('---');
  console.log('aws s3 ls');
  spawnSync("aws", ["s3", "ls", "kungfu-prebuilt/core/v2/v2.3.0/"], spawnOpts);
};