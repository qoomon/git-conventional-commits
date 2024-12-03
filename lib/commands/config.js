const fs = require("fs");
const path = require("path");
const YAML = require('yaml')

const defaultPath = "./git-conventional-commits.yaml";
const templatePath = `${__dirname}/../../git-conventional-commits.default.yaml`;

function load(configFile) {
    configFile = configFile || defaultPath;
    
    // legacy support for json config
    if(!fs.existsSync(configFile) ) {
        const jsonPath = configFile.replace(/\.yaml$/,".json")
        if(fs.existsSync(jsonPath)) {
            configFile = jsonPath
        }
    }

    const configText = fs.readFileSync(path.resolve(configFile)).toString();
    const configOverride = YAML.parse(configText);

    const config = defaultConfig();

    if (configOverride.convention) {
        const conventionConfig = config.convention;
        const conventionOverride = configOverride.convention;
        conventionConfig.releaseTagGlobPattern = conventionOverride.releaseTagGlobPattern ||
            conventionConfig.releaseTagGlobPattern;

        conventionConfig.msgRegex = RegExp(conventionOverride.commitMessageRegexPattern || conventionConfig.msgRegex);
        conventionConfig.commitTypes = conventionOverride.commitTypes || conventionConfig.commitTypes;
        conventionConfig.featureCommitTypes = conventionOverride.featureCommitTypes || conventionConfig.featureCommitTypes;
        conventionConfig.commitScopes = conventionOverride.commitScopes || conventionConfig.commitScopes;
        
        // Legacy support convention.issueRegexPattern
        config.changelog.issueRegexPattern = conventionOverride.issueRegexPattern || config.changelog.issueRegexPattern;
    }

    // check for mandatory capturing groups
    if (!hasAllCapturingGroups(config.convention.msgRegex, ['type', 'scope', 'breaking', 'description'])) {
        throw new Error(`msgRegex: ${config.convention.msgRegex.source} does not have all mandatory capture groups ('type', 'scope', 'breaking', 'description')`);
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
        changelogConfig.issueRegexPattern = changelogOverride.issueRegexPattern || changelogConfig.issueRegexPattern;
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
        },
        changelog: {
            commitTypes: ['feat', 'fix', 'perf'],
            includeInvalidCommits: true,
            commitScopes: null,
            commitIgnoreRegexPattern: "^WIP ",
            headlines: {
                "feat": "Features",
                "fix": "Bug Fixes",
                "perf": "Performance Improvements",
                "merge": "Merges",
                "breakingChange": "BREAKING CHANGES",
                "?": "? ? ?"
            },
            commitUrl: null,
            commitRangeUrl: null,
            issueRegexPattern: null,
            issueUrl: null
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

    config.changelog.commitIgnoreRegex = () => RegExp(config.changelog.commitIgnoreRegexPattern || '(?!)',"m");

    config.changelog.issueRegex = () => RegExp(
        "(?<=(^|\\s))" + (config.changelog.issueRegexPattern || '(?!)') + "(?=(\\s|$))",
        "mg"
    );

    return config;
}


function hasAllCapturingGroups(exp, groups) {
  return groups.every(group => exp.source.includes(`(?<${group}>`));
}

module.exports = {
    defaultPath,
    templatePath,
    load,
    defaultConfig,
    hasAllCapturingGroups
}
