const lib = exports.lib = require("./lib.js");
const core = require("@actions/core");
const github = require("@actions/github");

const main = function () {
    const awsProxy = core.getInput("aws-proxy");
    const artifactsPath = core.getInput("artifacts-path");
    const bucketStaging = core.getInput("bucket-staging");
    const bucketRelease = core.getInput("bucket-release");
    const repo = github.context.repo.repo;

    if (awsProxy) {
        lib.setupProxy(awsProxy);
    }

    if (artifactsPath && bucketStaging) {
        lib.clean(repo, bucketStaging);
        lib.stage(repo, artifactsPath, bucketStaging);
    }

    if (bucketStaging && bucketRelease) {
        lib.publish(repo, bucketStaging, bucketRelease);
        lib.clean(repo, bucketStaging);
    }
};

if (process.env.GITHUB_ACTION) {
    try {
        main();
    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
    }
}