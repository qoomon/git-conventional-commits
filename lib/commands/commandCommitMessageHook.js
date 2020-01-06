const Config = require("./config");
const CommitConvention = require("../gitCommitConvention");
const fs = require("fs");

exports.command = 'commit-msg-hook <commit-msg-file>'
exports.desc = 'Check for conventional commit message format'
exports.builder = function(yargs) {
  yargs.positional('commit-msg-file', {
    type: 'string',
    describe: 'Commit message file path',
  })
  yargs.option('config', {
    alias: 'c',
    desc: 'Config file path',
    default: Config.defaultPath,
    requiresArg: true
  })
}
exports.handler = async function(argv) {
  const convention = Config.load(argv.config).convention;
  const commitConvention = new CommitConvention(convention);

  const commitMessage = fs.readFileSync(argv.commitMsgFile).toString();
  const commitSubject = commitMessage.split('\n')[0];
  const conventionalCommit = commitConvention.parseCommit({
    subject: commitSubject
  });

  if (!conventionalCommit.type) {
    console.error(``);
    console.error(`[ERROR] Invalid commit message`);
    console.error(``);
    console.error(`  Valid message pattern: <TYPE>[(<SCOPE>)]: <SUBJECT>`);
    console.error(`  Valid types : ${convention.commitTypes.map(e => `'${e}'`).join(', ')}`);
    console.error(`  Valid scopes: ${!convention.commitScopes || !convention.commitScopes.length? '*' : convention.commitScopes.map(e => `'${e}'`).join(', ')}`);
    console.error(``);
    console.error(`  To adjust convention edit config file (${argv.config})`);
    process.exit(2);
  }
}
