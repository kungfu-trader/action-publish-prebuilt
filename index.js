const core = require('@actions/core');
const github = require("@actions/github");
const { publish } = require("./lib.js");

try {
    const context = github.context;
    const artifactsPath = core.getInput('artifacts-path');
    const s3Bucket = core.getInput('s3-bucket');
    const awsProxy = core.getInput('aws-proxy');
    publish(artifactsPath, s3Bucket, awsProxy);
} catch (error) {
    core.setFailed(error.message);
}