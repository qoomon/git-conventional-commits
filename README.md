# Git Conventional Commits

[![npm](https://img.shields.io/npm/v/git-conventional-commits)](https://www.npmjs.com/package/git-conventional-commits)

**ℹ Have a look at [Git Commit Conventions](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13)**

### Install
`npm install --global git-conventional-commits`

### Usage
* Create [config file](#config-file) `git-conventional-commits init`
* Adjust config `git-conventional-commits.json` to your needs

#### Commands
ℹ add help parameter `-h` to commands to list all possible options
```
  init [options]                               creates a config file template `git-conventional-commits.json`
  version [options]                            determine version from conventional commits
  changelog [options]                          generate change log from conventional commits
  commit-msg-hook [options] <commit-msg-file>  check for conventional commit message format
```

#### Config File
Example `git-conventional-commits.json`
```json
{
  "convention" : {
    "commitTypes": [
      "feat",
      "fix",
      "perf",
      "refactor",
      "style",
      "test",
      "build",
      "ops",
      "docs",
      "merge"
    ],
    "commitScopes": [],
    "releaseTagGlobPattern":  "v[0-9]*.[0-9]*.[0-9]*",
    "issueRegexPattern": "(^|\\s)#\\d+(\\s|$)"
  },

  "changelog" : {
    "commitTypes": [
      "feat",
      "fix",
      "perf",
      "merge",
      "?"
    ],
    "commitScopes": [],
    "commitIgnoreRegexPattern": "^WIP ",
    "headlines": {
      "feat": "Features",
      "fix": "Bug Fixes",
      "perf": "Performance Improvements",
      "merge": "Merged Branches",
      "breakingChange": "BREAKING CHANGES"
    },

    "commitUrl": "https://github.com/ACCOUNT/REPOSITORY/commit/%commit%",
    "commitRangeUrl": "https://github.com/ACCOUNT/REPOSITORY/compare/%from%...%to%?diff=split",
    "issueUrl": "https://github.com/ACCOUNT/REPOSITORY/issues/%issue%"
  }
}


```
* `convention`
  * `commitTypes` an array of expected commit types
    * show warnings for unexpected types
    * if not set or empty commit type validation is disabled
    * e.g. `["feat", "fix", "doc", "style"]`
  * `commitScopes` an array of expected commit types
    * show warnings for unexpected scopes
    * if not set or empty commit scope validation is disabled
    * e.g. `["ui", "database"]` 
  * `releaseTagGlobPattern` glob pattern to filter for release tags
    * release tags must contain semantic version (`[0-9]+\.[0-9]+\.[0-9]+`)
    * default `*`  
  * `issueRegexPattern` regex pattern to find issue IDs
    * e.g. Jira issue pattern `[A-Z]{3,}-\\d+`
 
* `changelog` 
  * `commitTypes` filter commits by type
    * a subset of `convention.commitTypes` plus
      * `merge` commits
      * `?` commits with unexpected message format
    * if not set or empty commit type filter is disabled
    * e.g. `["feat", "fix", "merge" , "?"]`
  * `commitScopes` filter commits by scopes
    * a subset of `convention.commitScopes`
    * if not set or empty commit scope filter is disabled
    * e.g. `["ui"]`
  * `commitIgnoreRegexPattern` filter commits by commit subject regex
    * default `^WIP `  
  * `headlines` a map of headline identifier and actual headline
    * a subset of `changelog.commitTypes` plus
      * `breakingChange` Breaking Changes Section
    * e.g. `{ "feat": "Features", "fix": "Bug Fixes", "breakingChange": "BREAKING CHANGES"}`  
    * default `{ "feat": "Features", "fix": "Bug Fixes", "merge": "Merged Branches", "breakingChange": "BREAKING CHANGES"}`
  * `commitUrl` an URL template for generating markdown links to repository commits
    * `%commit%` commit hash placeholder
    * eg `https://github.com/qoomon/git-conventional-commits/commit/%commit%`
    * if not set or empty link generation is disabled
  * `issueUrl` an URL template for generating markdown links to an issue tracker
    * `%issue%` issue id placeholder
    * eg `https://jira.example.org/browse/%issue%`
    * if not set or empty link generation is disabled
 

### Automatically Validate Commit Message Convention before Commit
* Setup Commit Message Hook to 
  * Navigate to your repository directory `cd <repository-path>`
  * Create git hook directory `mkdir .git-hooks`
  * Set update hooksPath `git config core.hooksPath .git-hooks`
  * Create commit message hook script and make it executable
    * `touch .git-hooks/commit-msg && chmod +x .git-hooks/commit-msg`
    * Open `.git-hooks/commit-msg` with your favorite editor and paste following script
      ```
      #!/bin/sh

      # fix for windows systems
      PATH="/c/Program Files/nodejs:$HOME/AppData/Roaming/npm/:$PATH"

      git-conventional-commits commit-msg-hook "$1"
      ```
  * Add and commit `.git-hooks/commit-msg` to repository
  * ⚠️ Whenever you clone your repository with git hooks you need to enable git hooks once again
    * `git config core.hooksPath .git-hooks`


### Release Workflow with `git-conventional-commits`
1. Determine version by `git-conventional-commits version`
1. Update version in project files
    * Commit version bump `git commit -am'build(release): bump project version to <version>'`
1. Generate change log by `git-conventional-commits changelog --release  <version> --file 'CHANGELOG.md'`
    * Commit change log `git commit -am'doc(release): create <version> change log entry'`
1. Tag commit with version `git tag -a -m'build(release): <version>' '<version-prefix><version>'`
1. Push all changes `git push`
1. Build and upload artifacts

---

## Build/Release
* `npm install`
* `npm test`
* `npm login`
* `npm publish`

