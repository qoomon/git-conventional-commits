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
      commitTypes: ['feat', 'fix'],
      featureCommitTypes: ['feat'],
      commitScopes: null,
      issueRegexPattern: null,
    },
    changelog: {
      commitTypes: ['feat', 'fix'],
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
  config.convention.msgRegex = /^(?<type>\w+)(?:\((?<scope>[^()]+)\))?:\s*(?<subject>.+)/i;
  config.convention.msgMergeRegex = /^Merge branch +["'](?<branch>.+)['"]/i;
  config.convention.msgRevertRegex = /^Revert +["'](?<subject>.+)['"]/i;
  config.convention.bodyRevertRegex = /(?<hash>[^\s]+)\.+?$/im;
  config.convention.semanticVersionRegex = /(?<major>[0-9]+)\.(?<minor>[0-9]+)\.(?<patch>[0-9]+)/;

  config.changelog.commitIgnoreRegex = () => RegExp(config.changelog.commitIgnoreRegexPattern || '(?!)');

  config.convention.issueRegex = () => RegExp("(?<=(^|\\s))" + (config.convention.issueRegexPattern || '(?!)') + "(?=(\\s|$))",
    "mg");

  return config;
}

module.exports = {
  defaultPath: defaultPath,
  templatePath: templatePath,
  load: load,
  defaultConfig: defaultConfig,
}
