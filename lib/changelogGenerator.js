module.exports = function (config) {

    /**
     * @function
     * @param {Object} commitLog - a list of commit candidates to be included in the changelog.
     * @param {Object} generatorParams - changelog specific generator parameters.
     * @param {string} generatorParams.releaseName - the version number of the release including an optional suffix.
     * @param {string} [generatorParams.customMarkdown] - optional custom markdown to be included in the changelog.
     * @param {boolean} generatorParams.includeInvalidCommits - if true, commits which do not match the ConCom spec will be included in the changelog.
     * @param {string[]} [generatorParams.commitTypes] - an optional list of all commit types to include in the changelog (e.g. ["fix", "feat", ...]).
     * @param {string[]} [generatorParams.commitScopes] - an optional list of all commit scopes to included in the changelog (e.g. ["deps", "dev-deps", ...]); If not set all scopes are included.
     * @param {RegExp} generatorParams.commitIgnoreRegex - regular expression that matches commits to be excluded from the changelog.
     */
    this.generateMarkdown = function (
        commitLog,
        {
            releaseName,
            customMarkdown,
            includeInvalidCommits,
            commitTypes,
            commitScopes,
            commitIgnoreRegex,
        }
    ) {
        const shouldIncludeInChangesSection = (commit) => {
            // filter by commit messages regex
            if (
                commitIgnoreRegex &&
                [commit.subject, commit.body].join("\n\n").match(commitIgnoreRegex)
            ) {
                return false;
            }

            // filter by commit type
            if (
                (commit.type || !includeInvalidCommits) && // undefined commit type
                commitTypes &&
                commitTypes.length && // no filter at all
                (commit.type === undefined || !commitTypes.includes(commit.type))
            ) {
                return false;
            }

            // filter by commit scope
            // noinspection RedundantIfStatementJS
            if (
                commit.scope &&
                commitScopes && commitScopes.length &&
                !commitScopes.includes(commit.scope)
            ) {
                return false;
            }

            return true;
        };
        const shouldIncludeInBreakingSection = (commit) => commit.breakingChanges.length > 0;

        const firstChangelogCommit = commitLog[0];
        const lastChangelogCommit = commitLog[Math.max(commitLog.length - 1, 0)];
        const changesSectionCommits = commitLog.filter(shouldIncludeInChangesSection);
        const breakingSectionCommits = commitLog.filter(shouldIncludeInBreakingSection);

        let changelogMarkdown = "";

        // ------ generate version headline
        let changelogCommitRangeMarkdown = markdownCommitRange(firstChangelogCommit.hash, lastChangelogCommit.hash);

        changelogMarkdown +=
            `## **${releaseName || lastChangelogCommit.hash}**` +
            `&emsp;<sub><sup>${yyyy_mm_dd(lastChangelogCommit.date)} (${changelogCommitRangeMarkdown})</sup></sub>\n\n`;

        if (changesSectionCommits.length > 0 || breakingSectionCommits.length > 0) {
            // ------ generate changes section
            const groupedChangelog = bucketAggregation(changesSectionCommits, (commit) => commit.type);
            const commitTypes = Object.keys(groupedChangelog).sort();
            commitTypes.forEach((commitType) => {
                changelogMarkdown += generateMarkdownCommitTypeSection(
                    commitType,
                    groupedChangelog[commitType]
                );
            });

            // ------ generate breaking section
            const groupedBreakingChangelog = bucketAggregation(
                breakingSectionCommits,
                (commit) => commit.type
            );
            const breakingCommits = Object.values(groupedBreakingChangelog).reduce(
                (result, typeCommits) => result.concat(typeCommits), []
            );
            if (breakingCommits.length) {
                changelogMarkdown += "\n" +
                    generateMarkdownBreakingChangesSection(breakingCommits);
            }

            // ------ generate custom markdown section
            if (customMarkdown && customMarkdown.length) {
                changelogMarkdown += "\n" +
                    generateCustomMarkdownSection(customMarkdown);
            }
        } else {
            changelogMarkdown += "*no relevant changes*\n";
        }

        changelogMarkdown +="<br>\n\n";

        return changelogMarkdown;
    };

    function generateMarkdownCommitTypeSection(commitType, commits) {
        const typeSectionHeadline = config.headlines[commitType !== 'undefined' ? commitType : '?'] || commitType;
        let typeSectionMarkdown = `### ${typeSectionHeadline}\n\n`;

        const scopedCommits = bucketAggregation(commits, commit => commit.scope);
        // sort scopes by name with, undefined scope at front, if present
        const commitScopes = Object.keys(scopedCommits).sort((l, r) => {
            if (l === 'undefined') return -1;
            if (r === 'undefined') return 1;
            return l > r ? 1 : -1;
        })
        commitScopes.forEach(scope => {
            typeSectionMarkdown += generateMarkdownScopeSection(scope, scopedCommits[scope]);
        });

        return typeSectionMarkdown;
    }

    function generateMarkdownScopeSection(scope, commits) {
        let scopeSectionMarkdown = '';
        if (scope !== 'undefined') {
            scopeSectionMarkdown += `##### &ensp;\`${scope}\`\n\n`;
        }
        commits.forEach(commit => {
            scopeSectionMarkdown += `- ${generateMarkdownCommit(commit)}`;
        });
        return scopeSectionMarkdown + '\n'
    }

    function generateMarkdownCommit(commit) {
        let commitMarkdown = '';
        if (commit.revert) {
            commitMarkdown += '**Revert** ';
        }
        let descriptionMarkdown = escapeMarkdown(commit.description);
        // replace issue references with links
        commit.description.match(config.issueRegex())?.forEach(issueId => {
            descriptionMarkdown = descriptionMarkdown.replace(escapeMarkdown(issueId), markdownIssueId(issueId));
        });
        commitMarkdown += descriptionMarkdown.trim();

        let referencesMarkdown = [markdownCommitHash(commit.hash)];
        // add issue references from body
        commit.body.match(config.issueRegex())?.forEach(issueId => {
            referencesMarkdown.push(markdownIssueId(issueId));
        });
        commitMarkdown += ` (${referencesMarkdown.join(', ')})\n`;

        return commitMarkdown;
    }

    function generateMarkdownBreakingChangesSection(commits) {
        const sectionHeadline = config.headlines["breakingChange"] || "BREAKING CHANGES";
        let changelogMarkdown = `### ${sectionHeadline}\n`;
        commits
            .sort((left, right) => (left.scope || "").localeCompare(right.scope || ""))
            .forEach(commit => commit.breakingChanges
                .forEach(breakingChange => {
                    const msgSubject = breakingChange.split('\n').splice(0, 1)[0];
                    const msgBody = breakingChange.split('\n').splice(1).join("\n")
                        .replace(/\n\n\n/, "\n\n").replace(/\n*$/, ""); // remove multiple empty lines and trailing spaces

                    let breakingChangeMarkdown = "- ";
                    if (commit.scope) {
                        breakingChangeMarkdown += `\`${commit.scope}\``;
                    }
                    if (msgSubject) {
                        breakingChangeMarkdown += ` ${escapeMarkdown(msgSubject)}`;
                    }
                    breakingChangeMarkdown += ` (${markdownCommitHash(commit.hash)})\n`;
                    if (msgBody) {
                        breakingChangeMarkdown += "\n";
                        breakingChangeMarkdown += `${escapeMarkdown(msgBody)}\n`;
                    }

                    changelogMarkdown += breakingChangeMarkdown;
                }));
        return changelogMarkdown;
    }

    function generateCustomMarkdownSection(customMarkdowns) {
        let changelogMarkdown = "";
        customMarkdowns.forEach((customMarkdown) => {
            changelogMarkdown += `${customMarkdown}\n`;
        });
        return changelogMarkdown;
    }

    function markdownLink(name, url) {
        return `[${name}](${url})`;
    }

    function markdownIssueId(issueId) {
        if (config.issueUrl) {
            const issueUrl = config.issueUrl.replace("%issue%", issueId);
            return markdownLink(issueId, issueUrl);
        }

        return issueId;
    }

    function markdownCommitHash(commitHash, revName) {
        if (config.commitUrl) {
            const commitUrl = config.commitUrl.replace("%commit%", commitHash);
            return markdownLink((revName || commitHash.substring(0, 7)), commitUrl);
        }

        return (revName || commitHash);
    }

    function markdownCommitRange(formCommitHash, toCommitHash) {
        if (config.commitRangeUrl) {
            const commitRangeUrl = config.commitRangeUrl
                .replace("%from%", formCommitHash)
                .replace("%to%", toCommitHash);
            return markdownLink(`${formCommitHash.substring(0, 7)}...${toCommitHash.substring(0, 7)}`, commitRangeUrl);
        }

        return `${formCommitHash}...${toCommitHash}`;
    }

};

function escapeMarkdown(text) {
    const markdownEscapeChars = ['\\', '`', '*', '{', '}', '[', ']', '(', ')', '#', '+', '-', '.', '!', '_', '>'];
    const markdownEscapeRegex = RegExp("[" + markdownEscapeChars.join("\\") + "]", "g");
    return text.replace(markdownEscapeRegex, "\\$&").replace(/\n/g, "\n  ");
}

function yyyy_mm_dd(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = date.getFullYear();
    return [yyyy, mm, dd].join("-");
}

function bucketAggregation(items, aggregation) {
    return items.reduce((buckets, item) => {
        const aggregationKey = aggregation(item);
        buckets[aggregationKey] = buckets[aggregationKey] || [];
        buckets[aggregationKey].push(item);
        return buckets;
    }, {})
}
