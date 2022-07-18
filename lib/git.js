const execAsync = require('./execAsync');

async function getLastTag(tagGlobPattern, commitRef = 'HEAD') {
    return await execAsync(`git describe --tags --match=${tagGlobPattern} --no-abbrev ${commitRef}`, {encoding: 'UTF-8'})
    .then(output => output.trim())
    .catch(err => {
      // return undefined if no tag was found
      if (err.exitCode === 128) {
        return;
      }
      throw err;
    });
}

const LOG_COMMIT_DELIMITER = '===LOG_COMMIT_DELIMITER===';
const LOG_FIELD_SEPARATOR = '===LOG_FIELD_SEPARATOR===';

async function getCommitLog(from, to = 'HEAD') {
  const gitLogFormat = ["%h", "%s", "%b"].join(LOG_FIELD_SEPARATOR) + LOG_COMMIT_DELIMITER;
  const gitLog = await execAsync(`git log --reverse --format=${gitLogFormat} ${from ? `${from}..` : ''}${to}`, {encoding: 'UTF-8'})
   .then(result => result.split(LOG_COMMIT_DELIMITER + '\n').slice(0, -1));

  return gitLog.map(commit => commit.split(LOG_FIELD_SEPARATOR))
    .map(commit => ({
      hash: commit[0],
      subject: commit[1],
      body: commit[2]
    }));
}

async function isEqualCommit(rev1, rev2) {
  if (!rev1 && !rev2) {
    return true;
  }

  if (!rev1 || !rev2) {
    return false;
  }

  const hashArray = await execAsync(`git rev-parse ${rev1}^{} ${rev2}^{}`, {encoding: 'UTF-8'})
    .then(result => result.split('\n'));

  return hashArray[0] === hashArray[1];
}

module.exports = {
  getLastTag,
  getCommitLog,
  isEqualCommit,
};
