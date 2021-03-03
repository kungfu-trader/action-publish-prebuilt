const fs = require("fs");
const path = require("path");
const glob = require("glob");
const readline = require('readline');
const { spawn, spawnSync } = require("child_process");

const spawnOptsInherit = { shell: true, stdio: "inherit", windowsHide: true };
const spawnOptsPipe = { shell: true, stdio: "pipe", windowsHide: true };

exports.publish = function (artifactsPath, s3Bucket, awsProxy) {
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
  console.log(`$ cat ${hostsFile}`);
  spawnSync("cat", [hostsFile], spawnOptsInherit);

  const s3DomainName = `${s3Bucket}.s3.cn-northwest-1.amazonaws.com.cn`;
  const tcpdump = spawn("tcpdump", ["-w", "/tmp/test.pcap", `host ${s3DomainName} or port 53`], spawnOptsPipe);
  tcpdump.on("close", (code, signal) => {
    spawnSync("tcpdump", ["-n", "-r", "/tmp/test.pcap", "-c", "10"], spawnOptsInherit);
  });

  console.log(`$ aws s3 rm --recursive s3://${s3Bucket}/core`);
  spawnSync("aws", ["s3", "rm", "--recursive", `s3://${s3Bucket}/core`], spawnOptsInherit);

  glob.sync(path.join(artifactsPath, "*")).map(artifactPath => {
    glob.sync(path.join(artifactPath, "*", "build", "stage", "*")).forEach(prebuiltPath => {
      const name = path.basename(prebuiltPath);
      const aws_args = [
        "s3", "sync", prebuiltPath, `s3://${s3Bucket}/${name}`,
        "--acl", "public-read", "--only-show-errors"
      ];
      console.log(`$ aws ${aws_args.join(' ')}`);
      spawnSync("aws", aws_args, spawnOptsInherit);
    });
  });
  console.log(`$ aws s3 ls --recursive ${s3Bucket}`);
  spawnSync("aws", ["s3", "ls", "--recursive", "--human-readable", s3Bucket], spawnOptsInherit);
  
  tcpdump.kill("SIGINT");
};