const lib = require("./lib.js");

const argv = require("yargs/yargs")(process.argv.slice(2))
    .option("repo", { description: "repo", type: "string" })
    .option("artifacts-path", { description: "artifacts path", type: "string" })
    .option("bucket-staging", { description: "S3 bucket for staging", type: "string" })
    .option("bucket-release", { description: "S3 bucket for release", type: "string" })
    .option("aws-proxy", { description: "AWS proxy in /etc/hosts", type: "string" })
    .help()
    .argv;

if (argv.awsProxy) {
    lib.setupProxy(argv.awsProxy);
}

if (argv.artifactsPath && argv.bucketStaging) {
    lib.clean(argv.repo, argv.bucketStaging);
    lib.stage(argv.repo, argv.artifactsPath, argv.bucketStaging);
}

if (argv.bucketStaging && argv.bucketRelease) {
    lib.publish(argv.repo, argv.bucketStaging, argv.bucketRelease);
    lib.clean(argv.repo, argv.bucketStaging);
}