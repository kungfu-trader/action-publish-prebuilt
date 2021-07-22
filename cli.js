/* eslint-disable no-restricted-globals */
const lib = require('./lib.js');

const argv = require('yargs/yargs')(process.argv.slice(2))
  .option('token', { description: 'token', type: 'string', demandOption: true })
  .option('owner', { description: 'owner', type: 'string' })
  .option('repo', { description: 'repo', type: 'string' })
  .option('artifacts-path', { description: 'artifacts path', type: 'string' })
  .option('bucket-staging', { description: 'S3 bucket for staging', type: 'string' })
  .option('bucket-release', { description: 'S3 bucket for release', type: 'string' })
  .option('aws-proxy', { description: 'AWS proxy in /etc/hosts', type: 'string' })
  .option('pull-request-number', { description: 'Pull Request number', type: 'number' })
  .help().argv;

if (argv.awsProxy) {
  lib.setupProxy(argv.awsProxy);
}

if (argv.artifactsPath && argv.bucketStaging) {
  lib.clean(argv.repo, argv.bucketStaging);
  lib.stage(argv.repo, argv.artifactsPath, argv.bucketStaging);
  lib
    .addPreviewComment(argv.token, argv.owner, argv.repo, argv.pullRequestNumber, argv.bucketStaging)
    .catch(console.error);
}

if (argv.bucketStaging && argv.bucketRelease) {
  lib.publish(argv.repo, argv.bucketStaging, argv.bucketRelease);
  lib.clean(argv.repo, argv.bucketStaging);
  lib
    .deletePreviewComment(argv.token, argv.owner, argv.repo, argv.pullRequestNumber, argv.bucketStaging)
    .catch(console.error);
}
