const Git = require("./git");

module.exports = function(convention) {

  async function getLastReleaseTag() {
    return await Git.lastTag(convention.releaseTagGlobPattern);
  }

  async function getCommitLog() {
    const lastReleaseTag = await getLastReleaseTag();
    const commits = await Git.commitLog(lastReleaseTag);
    return commits.map(parseCommit).reverse();
  }

  async function getVersion(conventionalCommits) {
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
    conventionalCommits.forEach(commit => {
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
    } else if (changes.feature > 0) {
      version.minor++;
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
    let conventionalSubject;
    const msgMatch = commit.subject.match(convention.msgRegex);
    if (msgMatch) {
      conventionalSubject = {
        type: msgMatch.groups.type,
        scope: msgMatch.groups.scope === '' ? undefined : msgMatch.groups.scope,
        subject: msgMatch.groups.subject
      }
    } else {
      const msgMergeMatch = commit.subject.match(convention.msgMergeRegex);
      if (msgMergeMatch) {
        conventionalSubject = {
          subject: commit.subject
        };
        console.error(`[WARN] revert commit`);
        console.error(`  ${commit.subject}`);
        console.error(`  ${commit.hash}`);
      } else {
        const msgRevertMatch = commit.subject.match(convention.msgRevertRegex);
        if (msgRevertMatch) {
          conventionalSubject = {
            subject: commit.subject
          };
          console.error(`[WARN] merge commit`);
          console.error(`  ${commit.subject}`);
          console.error(`  ${commit.hash}`);
        } else {
          conventionalSubject = {
            subject: commit.subject
          }
          console.error(`[WARN] invalid commit message format`);
          console.error(`  ${commit.subject}`);
          console.error(`  ${commit.hash}`);
        }
      }
    }

    if (conventionalSubject.type &&
      convention.commitTypes && convention.commitTypes.length &&
      !convention.commitTypes.includes(conventionalSubject.type)) {
      console.error(`[WARN] ${commit.hash} invalid commit type`);
      console.error(`  ${conventionalSubject.type}`);
      console.error(`  ${commit.hash}`);
      return {
        subject: commit.subject
      }
    }
    if (conventionalSubject.scope &&
      convention.commitScopes && convention.commitScopes.length &&
      !convention.commitScopes.includes(conventionalSubject.scope)) {
      console.error(`[WARN] ${commit.hash} invalid commit scope`);
      console.error(`  ${conventionalSubject.scope}`);
      console.error(`  ${commit.hash}`);
      return {
        subject: commit.subject
      }
    }

    return conventionalSubject;
  }

  this.parseCommit = parseCommit;
  this.commitLog = getCommitLog;
  this.version = getVersion;
};