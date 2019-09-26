const execa = require('execa');

async function getLastTag(tagGlobPattern, rev = 'HEAD', skipTagOnRev = true) {

  const lastTag = await execa('git',
      ['describe', '--tags', `--match=${tagGlobPattern}`, '--first-parent', '--no-abbrev', rev])
    .then(result => result.stdout)
    .catch(err => {
      // return undefined if no tag was found
      if (err.exitCode === 128) {
        return;
      }
      throw err;
    });

  if (skipTagOnRev && await isEqualCommit(lastTag, rev)) {
    return await getLastTag(tagGlobPattern, `${rev}~1`, false);
  }

  return lastTag;
}

const LOG_COMMIT_DELIMITER = '===LOG_COMMIT_DELIMITER===';
const LOG_FIELD_SEPARATOR = '===LOG_FIELD_SEPARATOR===';

async function getCommitLog(from, to = 'HEAD') {
  const gitLogFormat = ["%h", "%s", "%b"].join(LOG_FIELD_SEPARATOR) + LOG_COMMIT_DELIMITER;
  const gitLog = await execa('git', ['log', '--reverse', `--format=${gitLogFormat}`, `${from ? `${from}..` : ''}${to}`])
    .then(result => result.stdout + "\n");
  return gitLog.split(LOG_COMMIT_DELIMITER + '\n').slice(0, -1)
    .map(commit => commit.split(LOG_FIELD_SEPARATOR))
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

  const hashArray = await execa('git', ['rev-parse', `${rev1}^{}`, `${rev2}^{}`])
    .then(result => result.stdout.split('\n'));

  return hashArray[0] === hashArray[1];
}

module.exports = {
  lastTag: getLastTag,
  commitLog: getCommitLog
};