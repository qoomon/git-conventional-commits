# Git Conventional Changelog Generator 

[![npm](https://img.shields.io/npm/v/git-conventional-commits)](https://www.npmjs.com/package/git-conventional-commits)

**Please find attached [Git Commit Convention](#git-commit-convention)**

### Install
`npm install git-conventional-commits`

### Commands
```
  init [options]                               creates a config file template `git-conventional-commits.json`
  version [options]                            determine version from conventional commits
  changelog [options]                          generate change log from conventional commits
  commit-msg-hook [options] <commit-msg-file>  check for conventional commit message format
```

### Usage
* Create [config file](#config-file) `git-conventinal-commits init`
* Adjust config `git-conventional-commits.json` to your needs

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
      "doc"
    ],
    "commitScopes": [],
    "releaseTagGlobPattern":  "v[0-9]*.[0-9]*.[0-9]*",
    "issueRegexPattern": "[A-Z]{3,}-\\d+"
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

    "commitUrl": "https://github.com/ACCOUNT/REPO/commit/%commit%",
    "commitRangeUrl": "https://github.com/ACCOUNT/REPO/compare/%from%...%to%?diff=split",
    "issueUrl": "https://JIRA_URL/browse/%issue%"
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
  * Whenever you clone your repository with git hooks you need to enable git hooks once again by execute `git config core.hooksPath .git-hooks`


### Release Workflow with `git-conventional-commits`
1. Determine version by `git-conventional-changelog version`
1. Update version in project files
    * Commit version bump `git commit -am'build(release): bump project version to <version>'`
1. Generate change log by `git-conventional-changelog changelog --release  <version> --file 'CHANGELOG.md'`
    * Commit change log `git commit -am'doc(release): create <version> change log entry'`
1. Tag commit with version `git tag -a -m'build(release): <version>' '<version-prefix><version>'`
1. Push all changes `git push`
1. Build and upload artifacts

---
# Git Commit Convention

## Commit Formats

### Default
<pre>
<b><a href="#types">&lt;type&gt;</a></b></font>(<b><a href="#scopes">&lt;optional scope&gt;</a></b>): <b><a href="#subject">&lt;subject&gt;</a></b>
<sub>empty separator line</sub>
<b><a href="#body">&lt;optional body&gt;</a></b>
<sub>empty separator line</sub>
<b><a href="#footer">&lt;optional footer&gt;</a></b>
</pre>

### Merge
<pre>
Merge branch '<b>&lt;branch name&gt;</b>'
</pre>
<sup>Follows default git merge message</sup>

### Revert
<pre>
Revert "<b>&lt;commit headline&gt;</b>"
<sub>empty separator line</sub>
This reverts commit <b>&lt;commit hash&gt;</b>.
<b>&lt;optinal reason&gt;</b>
</pre>
<sup>Follows default git revert message</sup>

### Types
* API Relevant Changes **recognizable by your clients**
    * `feat` Commits, that adds a new feature
    * `fix` Commits, that fixes a bug
* `refactor` Commits, that rewrite/restructure your code, however does not change any behaviour
    * `perf` Commits are `refactor` commit, that improves performance
* `style` Commits, that do not affect the meaning (white-space, formatting, missing semi-colons, etc)
* `test` Commits, that add missing tests or correcting existing tests
* `doc` Commits, that affect documentation only
* `build` Commits, that affect build components like build tool, ci pipeline, dependencies, project version, ...
* `ops` Commits, that affect operational components like infrastructure, backup, recovery, ...

### Scopes
The `scope` provides additional contextual information.
* Is an **optional** part of the format
* Allowed Scopes depends on the specific project
* Don't use issue identifiers as scopes

### Subject
The `subject` contains a succinct description of the change.
* Is a **mandatory** part of the format
* Use the imperative, present tense: "change" not "changed" nor "changes"
* Don't capitalize the first letter
* No dot (.) at the end

### Body
The `body` should include the motivation for the change and contrast this with previous behavior.
* Is an **optional** part of the format
* Use the imperative, present tense: "change" not "changed" nor "changes"
* This is the place to mention issue identifiers and their relations

### Footer
The `footer` should contain any information about **Breaking Changes** and is also the place to **reference Issues** that this commit refers to.
* Is an **optional** part of the format
* **optionally** reference an issue by its id.
* **Breaking Changes** should start with the word `BREAKING CHANGES:` followed by space or two newlines. The rest of the commit message is then used for this.


### Examples
* ```
  feat(shopping cart): add the amazing button
  ```
* ```
  feat: remove ticket list endpoint
  
  refers to JIRA-1337
  BREAKING CHANGE: ticket enpoints no longer supports list all entites.
  ```
* ```
  fix: add missing parameter to service call
  
  The error occurred because of <reasons>.
  ```
* ```
  build: release version 1.0.0
  ```
* ```
  build: update dependencies
  ```
* ```
  refactor: implement calculation method as recursion
  ```
* ```
  style: remove empty line
  ```
* ```
  revert: refactor: implement calculation method as recursion
  
  This reverts commit 221d3ec6ffeead67cee8c730c4a15cf8dc84897a.
  ```

---
###### Sources
* [qoomon - conventional commit messages](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13)

## Build/Release
* `npm install`
* `npm test`
* `npm login`
* `npm publish`

