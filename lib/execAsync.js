const exec = require('child_process').exec;

module.exports = function (command, options) {
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
