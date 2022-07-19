const Config = require("./config");
const CommitConvention = require("../gitCommitConvention");
const fs = require("fs");

exports.command = 'commit-msg-hook <commit-msg-file>'
exports.desc = 'Check for conventional commit message format'
exports.builder = function (yargs) {
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
exports.handler = async function (argv) {
    const convention = Config.load(argv.config).convention;
    const commitConvention = new CommitConvention(convention);

    const commitMessage = fs.readFileSync(argv.commitMsgFile).toString();
    const commitSubject = commitMessage.split('\n')[0];
    const conventionalCommit = commitConvention.parseCommit({
        subject: commitSubject
    });

    if (!conventionalCommit.type) {
        console.error('[ERROR] Invalid commit message');
        console.error(`  Valid message pattern: <TYPE>[(<SCOPE>)]: <DESCRIPTION>`);
        process.exit(2);
    }

    let conventionError = false

    if (conventionalCommit.type &&
        convention.commitTypes && convention.commitTypes.length &&
        !convention.commitTypes.includes(conventionalCommit.type)) {
        conventionError = true
        console.error(`[ERROR] Unexpected commit type: '${conventionalCommit.type}'`);
        console.error(`  Permitted types : ${convention.commitTypes.map(e => `'${e}'`).join(', ')}`);
    }
    if (conventionalCommit.scope &&
        convention.commitScopes && convention.commitScopes.length &&
        !convention.commitScopes.includes(conventionalCommit.scope)) {
        conventionError = true
        console.error(`[ERROR] Unexpected commit scope: '${conventionalCommit.scope}'`);
        console.error(`  Permitted scopes: ${!convention.commitScopes || !convention.commitScopes.length ? '*' : convention.commitScopes.map(e => `'${e}'`).join(', ')}`);
    }

    if (conventionError) {
        console.error()
        console.error(`To adjust convention edit config file (${argv.config})`);
        process.exit(2);
    }
}
