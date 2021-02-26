const path = require("path");
const glob = require("glob");
const { spawnSync } = require("child_process");

const spawnOpts = { shell: true, stdio: "inherit", windowsHide: true };

exports.publish = function (artifactsPath) {
  console.log(`cwd: ${process.cwd()}`);
  glob.sync(path.join(artifactsPath, "*")).map(p => {
    console.log(`artifact: ${p}`);
  });
  spawnSync("aws", ["s3", "ls", "kungfu/core/v2/2.3.0/"], spawnOpts);
  spawnSync("cat", ["/etc/hosts"], spawnOpts);
};