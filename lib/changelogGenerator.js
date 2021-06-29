module.exports = function(config) {

  this.generateMarkdown = function(firstChangelogCommit, lastChangelogCommit, release, conventionalCommits, customMarkdown) {
    let changelogMarkdown = '';

    // ------ generate version headline
    let changelogCommitRangeMarkdown = markdownCommitRange(firstChangelogCommit, lastChangelogCommit);

    changelogMarkdown += `## **${release || lastChangelogCommit}**` +
      ` <sub><sup>${yyyy_mm_dd(new Date())} (${changelogCommitRangeMarkdown})</sup></sub>\n`;

    changelogMarkdown += '\n';

    if (conventionalCommits.length > 0) {
      // ------ generate type specific sections
      const groupedChangelog = bucketAggregation(conventionalCommits, commit => commit.type);
      const commitTypes = Object.keys(groupedChangelog).sort();
      commitTypes.forEach(commitType => {
        changelogMarkdown += generateMarkdownCommitTypeSection(commitType, groupedChangelog[commitType]);
      });

      // ------ generate breaking changes section
      const breakingCommits = Object.values(groupedChangelog)
        .reduce((result, typeCommits) => result.concat(typeCommits), [])
        .filter(commit => commit.breakingChanges.length);
      if (breakingCommits.length) {
        changelogMarkdown += generateMarkdownBreakingChangesSection(breakingCommits);
      }

      // ------ generate custom markdown section
      if (customMarkdown && customMarkdown.length) {
        changelogMarkdown += generateCustomMarkdownSection(customMarkdown);
      }
    } else {
      changelogMarkdown += "*no relevant changes*\n"
      changelogMarkdown += "\n"
    }

    return changelogMarkdown;
  };

  function generateMarkdownCommitTypeSection(commitType, commits) {
    const typeSectionHeadline = config.headlines[commitType !== 'undefined' ? commitType : '?'] || commitType;
    let typeSectionMarkdown = `### ${typeSectionHeadline}\n`;

    const groupedCommits = bucketAggregation(commits, commit => commit.scope);
    // sorted scopes with undefined scope at front, if present
    const commitScopes = Object.keys(groupedCommits).sort((l,r) => {
      if (l === 'undefined') return -1;
      if (r === 'undefined') return 1;
      return l > r ? 1 : -1;
    })
    commitScopes.forEach(scope => {
      let scopeSectionMarkdown = '';
      if (scope !== 'undefined') {
        scopeSectionMarkdown += `##### \`${scope}\`\n`;
      }
      groupedCommits[scope].forEach(commit => {
        scopeSectionMarkdown += `* ${generateMarkdownCommit(commit)}`;
      });

      typeSectionMarkdown += scopeSectionMarkdown + "\n";
    });

    return typeSectionMarkdown + "\n";
  }

  function generateMarkdownCommit(commit) {
    let commitMarkdown = '';
    if (commit.revert) {
      commitMarkdown += ` **Revert**`;
    }

    commitMarkdown += ` ${escapeMarkdown(commit.subject)}`;

    commitMarkdown += ` (${markdownCommitHash(commit.hash)}`;
    if (commit.relatedIssues) {
      commit.relatedIssues.forEach(issueId => {
        commitMarkdown += `, ${markdownIssueId(issueId)}`;
      });
    }
    commitMarkdown += ")\n";
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

          let breakingChangeMarkdown = "* ";
          if (commit.scope) {
            breakingChangeMarkdown += `\`${commit.scope}\``;
          }
          if (msgSubject) {
            breakingChangeMarkdown += ` ${escapeMarkdown(msgSubject)}`;
          }
          breakingChangeMarkdown += ` (${markdownCommitHash(commit.hash)})`;
          if (msgBody) {
            breakingChangeMarkdown += `<br>${escapeMarkdown(msgBody)}`;
          }
          breakingChangeMarkdown += "\n";
          changelogMarkdown += breakingChangeMarkdown;
        }));
    return changelogMarkdown + "\n";
  }

  function generateCustomMarkdownSection(customMarkdowns) {
    let changelogMarkdown = "";
    customMarkdowns.forEach((customMarkdown) => {
      changelogMarkdown += `${customMarkdown}\n`;
    });
    return changelogMarkdown + "\n";
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
      const commitRangeUrl = config.commitRangeUrl.replace("%from%", formCommitHash).replace("%to%",
        toCommitHash);
      return markdownLink(`${formCommitHash.substring(0, 7)}...${toCommitHash.substring(0, 7)}`, commitRangeUrl);
    }

    return `${formCommitHash}...${toCommitHash}`;
  }

};

function escapeMarkdown(text) {
  const markdownEscapeChars = ['\\', '`', '*', '{', '}', '[', ']', '(', ')', '#', '+', '-', '.', '!', '_', '>'];
  const markdownEscapeRegex = RegExp("[" + markdownEscapeChars.join("\\") + "]", "g");
  return text.replace(markdownEscapeRegex, "\\$&").replace(/\n/g, "<br>");
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
