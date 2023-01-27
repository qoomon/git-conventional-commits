const Config = require("./config");
const fs = require("fs");

const gitCommitMsgHookDefaultPath = './.git/hooks/commit-msg'
const gitCommitMsgHookTemplatePath = `${__dirname}/../../commit-msg.sh`;
const LOG_WARN = '\x1b[1m\x1b[33m[WARN]\x1b[0m';

exports.command = 'init'
exports.desc = `Creates config file and commit message hook`
exports.builder = function (yargs) {
    yargs.option('config', {
        alias: 'c',
        desc: 'Config file path',
        default: Config.defaultPath,
        requiresArg: true
    })
}

exports.handler = async function (argv) {
    if (!fs.existsSync(argv.config)) {
        console.info(`Creating config file ${argv.config}.`)
        fs.copyFileSync(Config.templatePath, argv.config, fs.constants.COPYFILE_EXCL);
    } else {
        console.warn(`${LOG_WARN} Could not creat config file ${argv.config}, because it already exists.`)
    }

    if (!fs.existsSync(gitCommitMsgHookDefaultPath)) {
        console.info(`Creating commit message hook ${gitCommitMsgHookDefaultPath}.`)
        fs.copyFileSync(gitCommitMsgHookTemplatePath, gitCommitMsgHookDefaultPath, fs.constants.COPYFILE_EXCL);
    } else {
        console.warn(`${LOG_WARN} Could not create message hook ${gitCommitMsgHookDefaultPath}, because it already exists.`)
    }
}
