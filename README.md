# Git Conventional Commits [![starline](https://starlines.qoo.monster/assets/qoomon/git-conventional-commits)](https://github.com/qoomon/starlines)

[![npm](https://img.shields.io/npm/v/git-conventional-commits)](https://www.npmjs.com/package/git-conventional-commits)

> [!TIP]
> Also have a look at **[Git Conventional Commits Cheat Sheet](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13)**

### Changelog
See [CHANGELOG.md](CHANGELOG.md).

### Usage
`npx git-conventional-commits <command>`

#### Commands
> [!TIP]
> Add the help flag `-h` to any command to list all possible options.

```
  init [options]                               create a config file template `git-conventional-commits.yaml`
  version [options]                            determine version from conventional commits
  changelog [options]                          generate changelog from conventional commits
  commit-msg-hook [options] <commit-msg-file>  check for conventional commit message format
```
  
#### First use
* Run `npx git-conventional-commits init`
* Adjust [config file](#config-file) `git-conventional-commits.yaml` to your needs

#### Config file
Example `git-conventional-commits.yaml`
```yaml
---
convention:
  # commitMessageRegexPattern: ^(?<type>\w+)(?:\((?<scope>[^()]+)\))?(?<breaking>!)?:\s*(?<description>.+)
  commitTypes:
  - feat     # Commits that add or remove a feature
  - fix      # Commits that fix a bug of a previous feat commit
  - refactor # Commits that rewrite/restructure your code, however do not change any behaviour
  - perf     # Commits that are special `refactor` commits or that improve performance
  - style    # Commits that do not affect the meaning (white-space, formatting, missing semicolons, etc.)
  - test     # Commits that add missing tests or correcting existing tests
  - build    # Commits that affect build components like build tool, ci pipeline, dependencies, project version, etc.
  - ops      # Commits that affect operational components like infrastructure, deployment, backup, recovery, etc.
  - docs     # Commits that affect documentation only
  - chore    # Miscellaneous commits e.g. modifying `.gitignore`
  - merge
  commitScopes: []
  releaseTagGlobPattern: v[0-9]*.[0-9]*.[0-9]*
changelog:
  commitTypes:
  - feat
  - fix
  - perf
  - merge
  includeInvalidCommits: true
  commitScopes: []
  commitIgnoreRegexPattern: "^WIP "
  headlines:
    feat: Features
    fix: Bug Fixes
    perf: Performance Improvements
    merge: Merges
    breakingChange: BREAKING CHANGES
  commitUrl: https://github.com/qoomon/git-conventional-commits/commit/%commit%
  commitRangeUrl: https://github.com/qoomon/git-conventional-commits/compare/%from%...%to%?diff=split
  issueRegexPattern: "#[0-9]+"
  issueUrl: https://github.com/qoomon/git-conventional-commits/issues/%issue%

```
* `convention`
  * `commitMessageRegexPattern` custom regex pattern for commit messages
    * the default regex pattern for the Conventional Commit format is `^(?<type>\w+)(?:\((?<scope>[^()]+)\))?(?<breaking>!)?:\s*(?<description>.+)`
    * you need to prepend/append your custom parts to this pattern if you still want to keep following the Conventional Commit format
  * `commitTypes` an array of expected commit types
    * show warnings for unexpected types
    * if not set or empty commit type validation is disabled
    * e.g. `["feat", "fix", "docs", "style"]`
  * `featureCommitTypes` an array of commit types that define a feature.
    * default `["feat"]`
  * `commitScopes` an array of expected commit scopes
    * show warnings for unexpected scopes
    * if not set or empty commit scope validation is disabled
    * e.g. `["ui", "database"]` 
  * `releaseTagGlobPattern` glob pattern to filter for release tags
    * release tags must contain semantic version (`[0-9]+\.[0-9]+\.[0-9]+`)
    * default `*`  
 
* `changelog` 
  * `commitTypes` filter commits by type
    * a subset of `convention.commitTypes` plus
      * `merge` commits
    * if not set or empty commit type filter is disabled
    * e.g. `["feat", "fix", "merge"]`
  * `commitScopes` filter commits by scopes
    * a subset of `convention.commitScopes`
    * if not set or empty commit scope filter is disabled
    * e.g. `["ui"]`
  * `includeInvalidCommits` include commits without valid type: default: `true`
    * if set to false all commits with undefined `commitTypes` will be removed from changelog 
  * `commitIgnoreRegexPattern` filter commits by commit subject regex
    * default `^WIP `  
  * `headlines` a map of headline identifier and actual headline
    * a subset of `changelog.commitTypes` plus
      * `breakingChange` Breaking Changes Section
    * e.g. `{ "feat": "Features", "fix": "Bug Fixes", "breakingChange": "BREAKING CHANGES"}`  
    * default `{ "feat": "Features", "fix": "Bug Fixes", "merge": "Merges", "breakingChange": "BREAKING CHANGES"}`
  * `commitUrl` a URL template for generating Markdown links to repository commits
    * `%commit%` commit hash placeholder
    * eg `https://github.com/qoomon/git-conventional-commits/commit/%commit%`
    * if not set or empty link generation is disabled
  * `issueUrl` a URL template for generating Markdown links to an issue tracker
    * `%issue%` issue id placeholder
    * eg `https://jira.example.org/browse/%issue%`
    * if not set or empty link generation is disabled
  * `issueRegexPattern` regex pattern to find issue IDs
    * e.g. Jira issue pattern `[A-Z]{3,}-\\d+`

### Automatically validate commit message convention before commit

To automatically validate commit messages, a git hook can be used in the `commit-msg` stage. 
The hook can be created either manually or using the [pre-commit framework](https://pre-commit.com/).

#### Setup with the pre-commit framework
* Create `.pre-commit-config.yaml` file in the root directory of your repository with following content. 
    ```yaml
    repos:
    - repo: https://github.com/qoomon/git-conventional-commits
      rev: <RELEASE_TAG>
      hooks:
        - id: conventional-commits
    ```
* Install the `pre-commit` framework `pip install pre-commit`
* Install the commit-msg hook `pre-commit install -t commit-msg`

#### Setup manually
* Set up a commit message hook to 
  * Navigate to your repository directory `cd <repository-path>`
  * Create git hook directory `mkdir .git-hooks`
  * Set update hooksPath `git config core.hooksPath .git-hooks`
  * Create commit message hook script and make it executable
    * `touch .git-hooks/commit-msg && chmod +x .git-hooks/commit-msg`
    * Open `.git-hooks/commit-msg` with your favorite editor and paste following script
      ```shell
      #!/bin/sh

      # fix for windows systems
      PATH="/c/Program Files/nodejs:$HOME/AppData/Roaming/npm/:$PATH"

      npx git-conventional-commits commit-msg-hook "$1"
      ```
  * Add and commit `.git-hooks/commit-msg` to repository

> [!IMPORTANT]
> Whenever you clone your repository with git hooks you need to enable git hooks once again
> <br>`git config core.hooksPath .git-hooks`

> [!TIP]
> You can document types/scopes inline via YAML comments, and they will show up in the hook error output.

### Tag discovery
* The latest release tag is found via `git describe --tags --match=<glob> --no-abbrev`, using the `releaseTagGlobPattern`.
* Pre-release tags are excluded automatically by adding `--exclude=<glob>-*`
* If HEAD points exactly at the last release tag commit, it will look for the previous release tag (HEAD~1).

### Versioning rules

> [!NOTE]
> A **breaking change** is defined by a commit message that contains `!` in the subject, or `BREAKING CHANGE`/`BREAKING CHANGES` in the body.
> A **feature** is defined by a commit message that contains one of the `featureCommitTypes` (by default: `[feat]`).
> Anything else will become a **patch** version update.

| Commit type     | Current version   | Version change    |
|-----------------|-------------------|-------------------|
| Breaking change | `0.y.z`           | minor (`0.y+1.z`) |
| Breaking change | `x.y.z` (`x >=1`) | major (`x+1.y.z`) |
| Feature         | *any*             | minor (`x.y+1.z`) |
| Anything else   | *any*             | patch (`x.y.z+1`) | 

### Release workflow with `git-conventional-commits`
* Determine version by `npx git-conventional-commits version`
* Update version in project files
  * Commit version bump `git commit -am'build(release): bump project version to <version>'`
* Generate changelog by `npx git-conventional-commits changelog --release  <version> --file 'CHANGELOG.md'`
  * Commit changelog `git commit -am'docs(release): create <version> changelog entry'`
* Tag commit with version `git tag -a -m'build(release): <version>' '<version-prefix><version>'`
* Push all changes `git push`
* Build and upload artifacts

### Integration with existing repository

If you have a large existing repo with no release tags e.g. `v1.0.0`, or if you want the first changelog to be tidy, you need to create a release tag first.
* Create a release tag for a specific commit `git tag -a -m'build(release): 0.0.0' 'v0.0.0'`
* Push tag `git push origin v0.0.0`
This way `npx git-conventional-commits` will only consider commits based on the commit the release tag is pointing at.

---
## Projects using git-conventional-commits
- https://github.com/Blazity/next-enterprise

---

## Build/Release
* `npm install`
* `npm test`
* `npm login`
* `npm publish`

