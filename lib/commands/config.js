const fs = require("fs");
const path = require("path");

const defaultPath = "./git-conventional-commits.json";
const templatePath = `${__dirname}/../../git-conventional-commits.default.json`;

function load(configFile) {
    configFile = configFile || defaultPath;

    const configText = fs.readFileSync(path.resolve(configFile)).toString();
    const configOverride = JSON.parse(configText);

    const config = defaultConfig();

    if (configOverride.convention) {
        const conventionConfig = config.convention;
        const conventionOverride = configOverride.convention;
        conventionConfig.releaseTagGlobPattern = conventionOverride.releaseTagGlobPattern ||
            conventionConfig.releaseTagGlobPattern;
        conventionConfig.commitTypes = conventionOverride.commitTypes || conventionConfig.commitTypes;
        conventionConfig.featureCommitTypes = conventionOverride.featureCommitTypes || conventionConfig.featureCommitTypes;
        conventionConfig.commitScopes = conventionOverride.commitScopes || conventionConfig.commitScopes;
        conventionConfig.issueRegexPattern = conventionOverride.issueRegexPattern || conventionConfig.issueRegexPattern;
    }

    if (configOverride.changelog) {
        const changelogConfig = config.changelog;
        const changelogOverride = configOverride.changelog;
        changelogConfig.commitTypes = changelogOverride.commitTypes || changelogConfig.commitTypes;
        changelogConfig.includeInvalidCommits = changelogOverride.includeInvalidCommits !== undefined
            ? changelogOverride.includeInvalidCommits === true
            : changelogConfig.includeInvalidCommits;
        changelogConfig.commitScopes = changelogOverride.commitScopes || changelogConfig.commitScopes;
        changelogConfig.commitIgnoreRegexPattern = changelogOverride.commitIgnoreRegexPattern || changelogConfig.commitIgnoreRegexPattern;
        changelogConfig.headlines = {
            ...changelogConfig.headlines,
            ...changelogOverride.headlines
        };

        changelogConfig.commitUrl = changelogOverride.commitUrl || changelogConfig.commitUrl;
        changelogConfig.commitRangeUrl = changelogOverride.commitRangeUrl || changelogConfig.commitRangeUrl;
        changelogConfig.issueUrl = changelogOverride.issueUrl || changelogConfig.issueUrl;
    }
    return config;
}

function defaultConfig() {
    const config = {
        convention: {
            releaseTagGlobPattern: "*",
            commitTypes: [
                'feat',
                'fix',
                'perf',
                'refactor',
                'style',
                'test',
                'build',
                'ops',
                'docs',
                'chore',
                'merge',
            ],
            featureCommitTypes: ['feat'],
            commitScopes: null,
            issueRegexPattern: null,
        },
        changelog: {
            commitTypes: ['feat', 'fix', 'perf'],
            includeInvalidCommits: true,
            commitScopes: null,
            commitIgnoreRegexPattern: null,
            headlines: {
                "feat": "Features",
                "fix": "Bug Fixes",
                "perf": "Performance Improvements",
                "merge": "Merged Branches",
                "breakingChange": "BREAKING CHANGES",
                "?": "???"
            },
            commitUrl: null,
            commitRangeUrl: null,
            issueUrl: null
        }
    };

    // regex patterns
    config.convention.msgRegex = /^(?<type>\w+)(?:\((?<scope>[^()]+)\))?(?<breaking>!)?:\s*(?<description>.+)/i;
    config.convention.msgMergeRegex = /^Merge branch +["'](?<branch>.+)['"]/i;
    config.convention.msgRevertRegex = /^Revert +["'](?<subject>.+)['"]/i;
    config.convention.bodyRevertRegex = /(?<hash>\S+)\.+?$/im; // \S - no white spaces
    // match only release version e.g. 1.2.3 ((?:[^-]|$) ignores pre-release versions e.g. 1.2.3-SNAPSHOT)
    config.convention.semanticVersionRegex = /(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/;

    config.changelog.commitIgnoreRegex = () => RegExp(config.changelog.commitIgnoreRegexPattern || '(?!)');

    config.convention.issueRegex = () => RegExp(
        "(?<=(^|\\s))" + (config.convention.issueRegexPattern || '(?!)') + "(?=(\\s|$))",
        "mg"
    );

    return config;
}

module.exports = {
    defaultPath,
    templatePath,
    load,
    defaultConfig,
}
