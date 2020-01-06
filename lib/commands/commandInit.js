const Config = require("./config");
const fs = require("fs");

exports.command = 'init'
exports.desc = 'Creates config file template `./git-conventional-commits.json`'
exports.builder = function(yargs) {
  yargs.option('config', {
    alias: 'c',
    desc: 'Config file path',
    default: Config.defaultPath,
    requiresArg: true
  })
}

exports.handler = async function(argv) {
  try {
    fs.copyFileSync(Config.templatePath, argv.config, fs.constants.COPYFILE_EXCL);
  } catch (e) {
    if (e.syscall === 'copyfile' && e.code === 'EEXIST') {
      throw Error(`Config file '${argv.config}' already exists.`);
    } else {
      throw e;
    }
  }
}
