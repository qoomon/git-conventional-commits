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
  
  yargs.option('version', { 
    alias: 'v', 
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
    desc: 'Prepend changlog to changelog file',
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
  try {
  
    const config = Config.load(argv.config);
    const commitConvention = new CommitConvention(config.convention);
    const changelogGenerator = new ChangelogGenerator(config.changelog);

    const conventionalCommits = await commitConvention.commitLog();

    let releaseName = argv.version || await commitConvention.version(conventionalCommits);
    if (argv.versionName) {
      releaseName += ` - ${argv.versionName}`;
    }

    const changelogCommits = conventionalCommits
        .filter(// filter by commit type
            commit => !commit.type || !config.changelog.commitTypes || !config.changelog.commitTypes.length
                || config.changelog.commitTypes.includes(commit.type))
        .filter( // filter by commit scope
            commit => !commit.scope || !config.changelog.commitScopes || !config.changelog.commitScopes.length
                || config.changelog.commitScopes.includes(commit.scope))
        .filter( // filter by commit messages regex
            commit => ![commit.subject, commit.body].join("\n\n").match(config.changelog.commitIgnoreRegex()))
        .map( commit => {
          if(['merge','revert'].includes(commit.type)){
            delete commit.type;
          }
          return commit;
        });

    // ------ generate markdown --------------------------------------
    let firstChangelogCommit = conventionalCommits[0].hash;
    let lastChangelogCommit = conventionalCommits.slice(-1)[0].hash;
    let changelogMarkdown = changelogGenerator.generateMarkdown(
      firstChangelogCommit, lastChangelogCommit, 
      releaseName, changelogCommits, argv.markdown);

    // ------ output -------------------------------------------------
    if (argv.file) {
        prependFileSync(argv.file, changelogMarkdown);
    } else {
        console.log(changelogMarkdown);
    }
  } catch(error){
    console.error(error);
  }
}

function prependFileSync (file, content) {
    let fileContent = '';
    if (fs.existsSync(file)) {
        fileContent = fs.readFileSync(file).toString();
    }
    fs.writeFileSync(file, content + fileContent);
}
