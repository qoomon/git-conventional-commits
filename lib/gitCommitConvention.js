const Git = require("./git");
const {applyChangesToVersion} = require("./semver");

module.exports = function (convention, commitAnchor = 'HEAD') {

    let commitLog

    this.getCommitLog = async function () {
        if (commitLog === undefined) {
            let lastReleaseTag = await getLastReleaseTag(commitAnchor)
            if (await Git.isEqualCommit(lastReleaseTag, commitAnchor)) {
                lastReleaseTag = await getLastReleaseTag(commitAnchor + '~1')
            }
            const commits = await Git.getCommitLog(lastReleaseTag, commitAnchor);
            commitLog = commits.map(this.parseCommit);
        }
        return commitLog
    }

    this.getVersion = async function () {
        let version = {
            major: 0,
            minor: 1,
            patch: 0
        };

        const lastReleaseTag = await getLastReleaseTag(commitAnchor);
        if (lastReleaseTag) {
            const lastVersionMatch = lastReleaseTag.match(convention.semanticVersionRegex);
            if (!lastVersionMatch) {
                console.error(`[ERROR] could not find semantic version pattern within last release tag '${lastReleaseTag}'`);
                process.exit(2);
            }

            version = {
                major: parseInt(lastVersionMatch.groups.major),
                minor: lastVersionMatch.groups.minor ? parseInt(lastVersionMatch.groups.minor) : 0,
                patch: lastVersionMatch.groups.patch ? parseInt(lastVersionMatch.groups.patch) : 0,
            }
        }

        if (!await Git.isEqualCommit(lastReleaseTag, commitAnchor)) {
            // ------determine version bump ---------------------------------------

            const changes = (await this.getCommitLog()).reduce((acc, commit) => {
                if (commit.breakingChanges && commit.breakingChanges.length) {
                    acc.breaking++;
                } else if (convention.featureCommitTypes.includes(commit.type)) {
                    acc.features++;
                } else {
                    acc.patches++;
                }
                return acc;
            }, {breaking: 0, features: 0, patches: 0});

            applyChangesToVersion(version, changes);
        }

        return `${version.major}.${version.minor}.${version.patch}`;
    }

    this.parseCommit = function (commit) {
        const conventionalCommit = {
            ...commit
        };

        // parse subject
        const conventionalSubject = parseCommitSubject(commit);
        Object.assign(conventionalCommit, conventionalSubject);

        // parse breaking changes
        conventionalCommit.breakingChanges = commit.body ? commit.body.split(/^BREAKING CHANGES?: */im).splice(1) : [];
        if (conventionalSubject.breaking && !conventionalCommit.breakingChanges.length) {
            conventionalCommit.breakingChanges = [conventionalSubject.description]
        }
        delete conventionalCommit.breaking;

        return conventionalCommit;
    }

    function parseCommitSubject(commit) {
        let conventionalSubject = {
            ...commit,
            description: commit.subject,
        };

        const msgMatch = commit.subject.match(convention.msgRegex);
        if (msgMatch) {
            conventionalSubject.type = msgMatch.groups.type;
            conventionalSubject.scope = msgMatch.groups.scope === '' ? undefined : msgMatch.groups.scope;
            conventionalSubject.breaking = msgMatch.groups.breaking === '!';
            conventionalSubject.description = msgMatch.groups.description;
        } else {
            const msgMergeMatch = getFirstMatch(commit.subject, convention.msgMergeRegexList);
            if (msgMergeMatch) {
                conventionalSubject.type = 'merge';
                conventionalSubject.description = msgMergeMatch.groups.description;
            } else {
                const msgRevertMatch = commit.subject.match(convention.msgRevertRegex);
                if (msgRevertMatch) {
                    conventionalSubject.subject = msgRevertMatch.groups.subject;
                    conventionalSubject = parseCommitSubject(conventionalSubject);
                    conventionalSubject.revert = !conventionalSubject.revert; // negate revert of revert commit
                } else {
                    console.warn(`[WARN] ${commit.hash ? `${commit.hash.substring(0, 7)} - ` : ''}Invalid commit subject format: '${commit.subject}'`);
                    return conventionalSubject;
                }
            }
        }

        if (conventionalSubject.type &&
            convention.commitTypes && convention.commitTypes.length &&
            !convention.commitTypes.includes(conventionalSubject.type)) {
            console.warn(`[WARN] ${commit.hash ? `${commit.hash} - ` : ''}Unexpected commit type: '${conventionalSubject.type}'`);
        }
        if (conventionalSubject.scope &&
            convention.commitScopes && convention.commitScopes.length &&
            !convention.commitScopes.includes(conventionalSubject.scope)) {
            console.warn(`[WARN] ${commit.hash ? `${commit.hash} - ` : ''}Unexpected commit scope: '${conventionalSubject.scope}'`);
        }

        return conventionalSubject;
    }

    async function getLastReleaseTag(commitRef) {
        return await Git.getLastTag({
            commitAnchor: commitRef,
            matchPattern: convention.releaseTagGlobPattern,
            excludePattern: '*-*', // exclude pre-release versions
        })
    }

    function getFirstMatch(string, regexList) {
        for (const regex of regexList) {
            const match = string.match(regex);
            if (match) {
                return match;
            }
        }
    }
};
