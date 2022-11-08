const fs = require("fs");
const ini = require("ini");
const path = require("path");

const defaultPath = "./git-conventional-commits.json";
const templatePath = `${__dirname}/../../git-conventional-commits.default.json`;

function getGitUrl() {
    const gitConfig = ini.parse(fs.readFileSync('./.git/config', 'utf-8'));
    let gitUrl = Object.keys(gitConfig).filter(key => key.indexOf('origin') !== -1).map(key => gitConfig[key].url)[0];

    gitUrl = gitUrl.replace('.git', '');

    if (gitUrl.indexOf('@') !== -1) {
        gitUrl = gitUrl
            .replace(":", "/")
            .replace(/\w*@/, 'https://');
    }

    return gitUrl;
}

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
        // Legacy support convention.issueRegexPattern
        config.changelog.issueRegexPattern = conventionOverride.issueRegexPattern || config.changelog.issueRegexPattern;
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

        changelogConfig.issueRegexPattern = changelogOverride.issueRegexPattern || changelogConfig.issueRegexPattern;

        if (configOverride.changelog.useGitInfo) {
            const gitUrl = getGitUrl();

            changelogConfig.commitUrl = gitUrl + '/commit/%commit%';
            changelogConfig.commitRangeUrl = gitUrl + '/compare/%from%...%to%?diff=split';
            changelogConfig.issueUrl = gitUrl + '/issues/%issue%"';
        } else {
            changelogConfig.commitUrl = changelogOverride.commitUrl || changelogConfig.commitUrl;
            changelogConfig.commitRangeUrl = changelogOverride.commitRangeUrl || changelogConfig.commitRangeUrl;
            changelogConfig.issueUrl = changelogOverride.issueUrl || changelogConfig.issueUrl;
        }
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
                "merge": "Merges",
                "breakingChange": "BREAKING CHANGES",
                "?": "???"
            },
            commitUrl: null,
            commitRangeUrl: null,
            issueRegexPattern: null,
            issueUrl: null,
            useGitInfo: false,
        }
    };

    // regex patterns
    config.convention.msgRegex = /^(?<type>\w+)(?:\((?<scope>[^()]+)\))?(?<breaking>!)?:\s*(?<description>.+)/i;
    config.convention.msgMergeRegexList = [
        /^Merge (?<description>.+)/i, // Default Git merge message
        /^Merged in (?<description>.+)/i, // Bitbucket merge message e.g. "Merged in team/repository/branch"
    ];
    config.convention.msgRevertRegex = /^Revert +["'](?<subject>.+)['"]/i;
    config.convention.bodyRevertRegex = /(?<hash>\S+)\.+?$/im; // \S - no white spaces
    // match only release version e.g. 1.2.3 ((?:[^-]|$) ignores pre-release versions e.g. 1.2.3-SNAPSHOT)
    config.convention.semanticVersionRegex = /(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/;

    config.changelog.commitIgnoreRegex = () => RegExp(config.changelog.commitIgnoreRegexPattern || '(?!)');

    config.changelog.issueRegex = () => RegExp(
        "(?<=(^|\\s))" + (config.changelog.issueRegexPattern || '(?!)') + "(?=(\\s|$))",
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
