const argv = require("yargs/yargs")(process.argv.slice(2))
    .option("artifacts-path", { description: "artifacts path" })
    .demandOption(["artifacts-path"])
    .help()
    .argv;

const { publish } = require("./lib.js");

publish(argv.artifactsPath);