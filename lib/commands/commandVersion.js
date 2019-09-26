const Config = require("./config");
const CommitConvention = require("../gitCommitConvention");

exports.command = 'version'
exports.desc = 'Determine version from conventional commits'
exports.builder = function(yargs) {
  yargs.option('config', {
    alias: 'c',
    desc: 'Config file path',
    default: Config.defaultPath,
    requiresArg: true
  })
}

exports.handler = async function(argv) {
  const config = Config.load(argv.config);
  const commitConvention = new CommitConvention(config.convention);

  const conventionalCommits = await commitConvention.commitLog();

  const conventionalVersion = await commitConvention.version(conventionalCommits);

  console.log(conventionalVersion);
}