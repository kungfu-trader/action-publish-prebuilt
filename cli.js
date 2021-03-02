const argv = require("yargs/yargs")(process.argv.slice(2))
    .option("artifacts-path", { description: "artifacts path", type: "string" })
    .option("s3-bucket", { description: "S3 bucket", type: "string", default: "kungfu-prebuilt" })
    .option("aws-proxy", { description: "AWS proxy in /etc/hosts", type: "string" })
    .demandOption(["artifacts-path"])
    .help()
    .argv;

const { publish } = require("./lib.js");

publish(argv.artifactsPath, argv.s3Bucket, argv.awsProxy);