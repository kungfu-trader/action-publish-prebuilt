const argv = require("yargs/yargs")(process.argv.slice(2))
    .option("artifacts-path", { description: "artifacts path", type: "string" })
    .option("bucket-prebuilt", { description: "S3 bucket for prebuilt", type: "string", default: "kungfu-prebuilt" })
    .option("bucket-app", { description: "S3 bucket for app", type: "string", default: "kungfu-app" })
    .option("aws-proxy", { description: "AWS proxy in /etc/hosts", type: "string" })
    .demandOption(["artifacts-path"])
    .help()
    .argv;

const { publish } = require("./lib.js");

publish(argv.artifactsPath, argv.awsProxy, argv.bucketPrebuilt, argv.bucketApp);