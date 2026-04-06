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
            const filteredCommits = filterFixupSquashCommits(commits);
            commitLog = filteredCommits.map(this.parseCommit);
        }
        return commitLog
    }

    this.getVersion = async function () {
        let version = {
            major: 0,
            minor: 0,
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
        conventionalCommit.breakingChanges = commit.body ? commit.body.split(/^BREAKING[ -]CHANGES?: */im).splice(1) : [];
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
            if (!conventionalSubject.type)
                throw new Error(`Invalid msgRegex: ${convention.msgRegex}. Capturing group 'type' is empty.`);
            conventionalSubject.scope = msgMatch.groups.scope === '' ? undefined : msgMatch.groups.scope;
            conventionalSubject.breaking = msgMatch.groups.breaking === '!';
            conventionalSubject.description = msgMatch.groups.description;
            if (!conventionalSubject.description)
                throw new Error(`Invalid msgRegex: ${convention.msgRegex}. Capturing group 'description' is empty.`);
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
            console.warn(`[WARN] ${commit.hash ? `${commit.hash.substring(0, 7)} - ` : ''}Unexpected commit type: '${conventionalSubject.type}'`);
        }
        if (conventionalSubject.scope &&
            convention.commitScopes && convention.commitScopes.length &&
            !convention.commitScopes.includes(conventionalSubject.scope)) {
            console.warn(`[WARN] ${commit.hash ? `${commit.hash.substring(0, 7)} - ` : ''}Unexpected commit scope: '${conventionalSubject.scope}'`);
        }

        return conventionalSubject;
    }

    async function getLastReleaseTag(commitRef) {
        return await Git.getLastTag({
            commitAnchor: commitRef,
            matchPattern: convention.releaseTagGlobPattern,
            excludePattern: `${convention.releaseTagGlobPattern}-*`, // exclude pre-release versions
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

    /**
     * Filters out fixup! and squash! commits when the referenced commit is part of the commit range.
     * Uses prefix matching to align with git's autosquash behavior (e.g. "fixup! feat" matches "feat: add feature").
     * If the referenced commit is not in the range, the fixup/squash commit is kept (treated as invalid).
     * @param {Array} commits - list of raw commits
     * @returns {Array} filtered commits
     */
    function filterFixupSquashCommits(commits) {
        const commitSubjects = commits.map(commit => commit.subject);
        return commits.filter(commit => {
            const referencedSubject = getFixupSquashReferenceSubject(commit.subject);
            if (referencedSubject === undefined) {
                return true; // not a fixup/squash commit
            }
            // ignore if a matching commit is in the range (prefix match, like git autosquash)
            return !commitSubjects.some(subject => subject.startsWith(referencedSubject));
        });
    }
};

const FIXUP_SQUASH_PREFIX_REGEX = /^(?:fixup|squash)! /;

/**
 * Extracts the referenced commit subject from a fixup! or squash! commit message.
 * @param {string} subject - commit subject
 * @returns {string|undefined} the referenced commit subject, or undefined if not a fixup/squash commit
 */
function getFixupSquashReferenceSubject(subject) {
    if (!FIXUP_SQUASH_PREFIX_REGEX.test(subject)) {
        return undefined;
    }
    return subject.replace(FIXUP_SQUASH_PREFIX_REGEX, '');
}

module.exports.getFixupSquashReferenceSubject = getFixupSquashReferenceSubject;
