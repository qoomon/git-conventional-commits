const execAsync = require('./execAsync');

/**
 * @function
 * @param {Object} options - changelog specific generator parameters.
 * @param {Object} [options.commitAnchor] - commit anchor.
 * @param {string} [options.matchPattern] - tag glob pattern.
 * @param {string} [options.excludePattern] - tag exclude glob pattern.
 */
async function getLastTag(
    {
        commitAnchor = 'HEAD',
        matchPattern= '*',
        excludePattern,
    }
) {
    return await execAsync(`git describe --tags --match=${matchPattern} ${excludePattern ? `--exclude=${excludePattern}` : ''} --no-abbrev ${commitAnchor}`, {encoding: 'UTF-8'})
        .then(output => output.trim())
        .catch(err => {
            // return undefined if no tag was found
            if (err.code === 128) {
                return;
            }
            throw err;
        });
}

const LOG_COMMIT_DELIMITER = '===LOG_COMMIT_DELIMITER===';
const LOG_FIELD_SEPARATOR = '===LOG_FIELD_SEPARATOR===';

async function getCommitLog(from, to = 'HEAD') {
    const gitLogFormat = ["%H", "%aI", "%s", "%b"].join(LOG_FIELD_SEPARATOR) + LOG_COMMIT_DELIMITER;
    const gitLog = await execAsync(`git log --reverse --format=${gitLogFormat} ${from ? `${from}..` : ''}${to}`, {encoding: 'UTF-8'})
        .then(result => result.split(LOG_COMMIT_DELIMITER + '\n').slice(0, -1))
        .catch(err => {
            // return empty log if no commits available
            if (err.code === 128) {
                return [];
            }
            throw err;
        });

    return gitLog.map(commit => commit.split(LOG_FIELD_SEPARATOR))
        .map(fields => ({
            hash: fields[0],
            date: new Date(fields[1]),
            subject: fields[2],
            body: fields[3]
        }));
}

async function isEqualCommit(rev1, rev2) {
    if (!rev1 && !rev2) {
        return true;
    }

    if (!rev1 || !rev2) {
        return false;
    }

    const hashArray = await execAsync(`git rev-parse "${rev1}^{}" "${rev2}^{}"`, {encoding: 'UTF-8'})
        .then(result => result.split('\n'));

    return hashArray[0] === hashArray[1];
}

module.exports = {
    getLastTag,
    getCommitLog,
    isEqualCommit,
};
