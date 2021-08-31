const Git = require("./git");

module.exports = function(convention, commitAnchor = 'HEAD') {
  
  let lastTag
  let commitLog

  async function getLastReleaseTag() {
    if(lastTag === undefined){
      lastTag = await Git.lastTag(convention.releaseTagGlobPattern, commitAnchor)
    } 
    return lastTag
  }

  async function getCommitLog() {
    if(commitLog === undefined){
      const lastReleaseTag = await getLastReleaseTag()
      const commits = await Git.commitLog(lastReleaseTag, commitAnchor);
      commitLog = commits.map(parseCommit);
    }
    return commitLog
  }

  async function getVersion() {
    const version = {
      major: 0,
      minor: 0,
      patch: 0
    };

    const lastReleaseTag = await getLastReleaseTag();
    if (lastReleaseTag) {
      const lastVersionMatch = lastReleaseTag.match(convention.semanticVersionRegex);
      if (!lastVersionMatch) {
        console.error(`[ERROR] could not find semantic version pattern within last release tag '${lastReleaseTag}'`);
        process.exit(2);
      }
      version.major = parseInt(lastVersionMatch.groups.major);
      version.minor = lastVersionMatch.groups.minor ? parseInt(lastVersionMatch.groups.minor) : 0;
      version.patch = lastVersionMatch.groups.patch ? parseInt(lastVersionMatch.groups.patch) : 0;
    }

    // ------determine version bump ---------------------------------------
    const changes = {
      breaking: 0,
      feature: 0,
      patch: 0
    };
    
    (await getCommitLog()).forEach(commit => {
      if (commit.breakingChanges && commit.breakingChanges.length) {
        changes.breaking++;
      } else if (convention.featureCommitTypes.includes(commit.type)) {
        changes.feature++;
      } else {
        changes.patch++;
      }
    });

    if (changes.breaking > 0) {
      version.major++;
      version.minor = 0;
      version.patch = 0;
    } else if (changes.feature > 0) {
      version.minor++;
      version.patch = 0;
    } else {
      version.patch++;
    }

    return `${version.major}.${version.minor}.${version.patch}`;
  }

  function parseCommit(commit) {
    const conventionalCommit = {
      ...commit
    };

    // parse subject
    const conventionalSubject = parseCommitSubject(commit);
    Object.assign(conventionalCommit, conventionalSubject);

    // parse breaking changes
    conventionalCommit.breakingChanges = !commit.body ? [] : commit.body.split(/^BREAKING CHANGES?: */im).splice(1);

    // parse issue ids
    conventionalCommit.relatedIssues = [commit.subject, commit.body].join("\n\n").match(convention.issueRegex()) || [];

    return conventionalCommit;
  }

  function parseCommitSubject(commit) {
    const subject = commit.subject;
    let conventionalSubject;
    const msgMatch = subject.match(convention.msgRegex);
    if (msgMatch) {
      conventionalSubject = {
        type: msgMatch.groups.type,
        scope: msgMatch.groups.scope === '' ? undefined : msgMatch.groups.scope,
        subject: msgMatch.groups.subject
      }
    } else {
      const msgMergeMatch = subject.match(convention.msgMergeRegex);
      if (msgMergeMatch) {
        conventionalSubject = {
          type: 'merge',
          subject: msgMergeMatch.groups.branch
        };
      } else {
        const msgRevertMatch = subject.match(convention.msgRevertRegex);
        if (msgRevertMatch) {
          conventionalSubject = parseCommitSubject({
            ...commit,
            subject: msgRevertMatch.groups.subject
          });
          conventionalSubject.revert = !conventionalSubject.revert; // negate revert of revert commit
        } else {
          console.error(`[WARN] Invalid commit subject format: '${subject}'${commit.hash ? ` (${commit.hash})` : ''}`);
          conventionalSubject = {
            subject: subject
          };
        }
      }
    }

    if (conventionalSubject.type &&
      convention.commitTypes && convention.commitTypes.length &&
      !convention.commitTypes.includes(conventionalSubject.type)) {
      console.error(
        `[WARN] Unexpected commit type: '${conventionalSubject.type}'${commit.hash ? ` (${commit.hash})` : ''}`);
      return {
        subject: subject
      }
    }
    if (conventionalSubject.scope &&
      convention.commitScopes && convention.commitScopes.length &&
      !convention.commitScopes.includes(conventionalSubject.scope)) {
      console.error(
        `[WARN] Unexpected commit scope: '${conventionalSubject.scope}'${commit.hash ? ` (${commit.hash})` : ''}`);
      return {
        subject: subject
      }
    }

    return conventionalSubject;
  }

  this.parseCommit = parseCommit;
  this.commitLog = getCommitLog;
  this.version = getVersion;
};