const Config = require("./config");
const CommitConvention = require("../gitCommitConvention");
const ChangelogGenerator = require("../changelogGenerator");
const fs = require('fs');

exports.command = 'changelog'
exports.desc = 'Generate change log from conventional commits'
exports.builder = function (yargs) {
    yargs.option('config', {
        alias: 'c',
        desc: 'Config file path',
        default: Config.defaultPath,
        requiresArg: true
    })
    yargs.option('commit', {
        desc: 'Commit anchor e.g. v1.0.0',
        default: 'HEAD',
        requiresArg: true
    })

    yargs.option('release', {
        alias: 'r',
        desc: 'Release version',
        requiresArg: true
    })
    yargs.option('name', {
        alias: 'n',
        desc: 'Release name',
        requiresArg: true
    })
    yargs.option('file', {
        alias: 'f',
        desc: 'Prepend changelog to a file',
        requiresArg: true
        // https://github.com/yargs/yargs/blob/master/docs/api.md#coercekey-fn
    })
    yargs.option('markdown', {
        alias: 'm',
        type: 'string',
        array: true,
        desc: 'Add multiple custom markdown snippets e.g. "### Assets\\n* [awesome app](https://example.org/awesome.zip)"',
        requiresArg: true
    })
}

exports.handler = async function (argv) {
    const config = Config.load(argv.config);
    const commitConvention = new CommitConvention(config.convention, argv.commit);
    const changelogGenerator = new ChangelogGenerator(config.changelog);

    let releaseName = argv.release || (await commitConvention.getVersion());
    if (argv.name) {
        releaseName += ` - ${argv.name}`;
    }

    const commitLog = await commitConvention.getCommitLog();

    // ------ generate markdown --------------------------------------
    let changelogMarkdown = changelogGenerator.generateMarkdown(commitLog, {
        releaseName,
        customMarkdown: argv.markdown,
        includeInvalidCommits: config.changelog.includeInvalidCommits,
        commitTypes: config.changelog.commitTypes,
        commitScopes: config.changelog.commitScopes,
        commitIgnoreRegex: new RegExp(config.changelog.commitIgnoreRegexPattern, "m")
    });

    // ------ output -------------------------------------------------
    if (argv.file) {
        prependFileSync(argv.file, changelogMarkdown);
    } else {
        console.log(changelogMarkdown);
    }
};

function prependFileSync(file, content) {
    let fileContent = '';
    if (fs.existsSync(file)) {
        fileContent = fs.readFileSync(file).toString();
    }
    fs.writeFileSync(file, content + fileContent);
}
