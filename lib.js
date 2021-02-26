const fs = require("fs");
const path = require("path");
const glob = require("glob");
const { spawnSync } = require("child_process");

const spawnOpts = { shell: true, stdio: "inherit", windowsHide: true };

exports.publish = function (artifactsPath) {
  console.log(`cwd: ${process.cwd()}`);
  glob.sync(path.join(artifactsPath, "*")).map(p => {
    const stat = fs.lstatSync(p);
    console.log(`artifact: ${p}, directory: ${stat.isDirectory()}`);
    console.log(stat);
    console.log('---');
  });
  spawnSync("aws", ["s3", "ls", "kungfu/core/v2/2.3.0/"], spawnOpts);
  console.log('---');
  spawnSync("cat", ["/etc/hosts"], spawnOpts);
  console.log('---');
  fs.appendFileSync('/etc/hosts', '127.0.0.1 local-test-kungfu');
  spawnSync("cat", ["/etc/hosts"], spawnOpts);
};