const core = require('@actions/core');
const github = require("@actions/github");
const { publish } = require("./lib.js");

try {
    const context = github.context;
    const artifactsPath = core.getInput('artifacts-path');
    const awsProxy = core.getInput('aws-proxy');
    const bucketPrebuilt = core.getInput('bucket-prebuilt');
    const bucketApp = core.getInput('bucket-app');
    publish(artifactsPath, awsProxy, bucketPrebuilt, bucketApp);
} catch (error) {
    core.setFailed(error.message);
}