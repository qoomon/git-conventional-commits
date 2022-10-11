const exec = require('child_process').exec;

module.exports = function (command, options) {
    options = Object.assign({}, options, {maxBuffer: (1024 * 1024)});
    return new Promise(function (resolve, reject) {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}
