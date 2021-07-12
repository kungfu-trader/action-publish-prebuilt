const lib = exports.lib = require("./lib.js");
const core = require("@actions/core");
const github = require("@actions/github");

const main = function () {
    const awsProxy = core.getInput("aws-proxy");
    const artifactsPath = core.getInput("artifacts-path");
    const bucketStaging = core.getInput("bucket-staging");
    const bucketProduction = core.getInput("bucket-production");
    const repo = github.context.repo.repo;

    if (awsProxy) {
        lib.setupProxy(awsProxy);
    }

    if (artifactsPath && bucketStaging) {
        lib.clean(repo, bucketStaging);
        lib.stage(repo, artifactsPath, bucketStaging);
    }

    if (bucketStaging && bucketProduction) {
        lib.publish(repo, bucketStaging, bucketProduction);
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