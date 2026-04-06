const fs = require("fs");
const path = require("path");
const temp = require("tmp-promise");
const execAsync = require("../../lib/execAsync");
const YAML = require('yaml')

const commandChangelog = require("../../lib/commands/commandChangelog");


beforeEach(async () => {
    const tempDirectory = await temp.dir();
    process.chdir(tempDirectory.path);

    await execAsync("git init");

    const config = {}
    fs.writeFileSync("git-conventional-commits.yaml", YAML.stringify(config), 'utf8');
});

const createSimpleChangelog = async (commitSubject, commitBody) => {
    const changelogFile = "CHANGELOG.md";

    // add commitMessage 0
    fs.writeFileSync("text.txt", "0");
    await execAsync("git add text.txt");
    await execAsync("git commit -a -m init");

    // add tag 1
    const givenVersionTag1 = "v1.0.0";
    await execAsync(`git tag -a -m ${givenVersionTag1} ${givenVersionTag1}`);

    // add commitMessage 1
    fs.writeFileSync("text.txt", "1");

    let gitCmd = `git commit -a -m "${commitSubject}"`;
    if (commitBody) {
        gitCmd += ` -m "${commitBody}"`;
    }
    await execAsync(gitCmd);

    // WHEN
    await commandChangelog.handler({
        config: "./git-conventional-commits.yaml",
        file: changelogFile,
    });

    return fs.readFileSync(changelogFile).toString();
};

test("commandChangelog - included commit", async () => {
    // GIVEN
    const commitType = "fix";
    const commitMessage = "prevent bad stuff from happening";
    const commitSubject = `${commitType}: ${commitMessage}`;

    // WHEN
    const changelogString = await createSimpleChangelog(commitSubject, null);

    // THEN
    expect(changelogString).toMatch(
        new RegExp(`Bug Fixes\\s+-\\s+${commitMessage}`, "g")
    );
});

test("commandChangelog - ignored commit", async () => {
    // GIVEN
    const commitType = "refactor";
    const commitMessage = "make all private fields lowercase";
    const commitSubject = `${commitType}: ${commitMessage}`;

    // WHEN
    const changelogString = await createSimpleChangelog(commitSubject, null);

    // THEN
    expect(changelogString).toMatch(/no relevant changes/);
});

test("commandChangelog - included because breaking", async () => {
    // GIVEN
    const commitType = "refactor";
    const commitMessage = "make all private fields lowercase";
    const commitSubject = `${commitType}: ${commitMessage}`;

    const commitBodyType = "BREAKING CHANGES";
    const commitBodyMessage =
        "configuration field foo is renamed to bar, update your configuration file";
    const commitBody = `${commitBodyType}: ${commitBodyMessage}`;

    // WHEN
    const changelogString = await createSimpleChangelog(
        commitSubject,
        commitBody
    );

    // THEN
    expect(changelogString).toMatch(
        new RegExp(`BREAKING CHANGES\\s+-\\s+${commitBodyMessage}`, "g")
    );
});

test("commandChangelog - ignored by regex pattern", async () => {
    // GIVEN
    const commitType = "fix";
    const commitMessage = "Just a work in progress";
    const commitSubject = `${commitType}: ${commitMessage}`;

    const commitBody = "WIP I want to be ignored";

    // WHEN
    const changelogString = await createSimpleChangelog(
        commitSubject,
        commitBody
    );

    // THEN
    expect(changelogString).toMatch(/no relevant changes/);
});

test("commandChangelog - fixup! commit is ignored when referenced commit is in range", async () => {
    // GIVEN
    const changelogFile = "CHANGELOG.md";

    // add init commit
    fs.writeFileSync("text.txt", "0");
    await execAsync("git add text.txt");
    await execAsync("git commit -a -m init");

    // add tag
    const givenVersionTag = "v1.0.0";
    await execAsync(`git tag -a -m ${givenVersionTag} ${givenVersionTag}`);

    // add a conventional commit
    fs.writeFileSync("text.txt", "1");
    await execAsync('git commit -a -m "feat: add new feature"');

    // add a fixup commit referencing the conventional commit
    fs.writeFileSync("text.txt", "2");
    await execAsync('git commit -a -m "fixup! feat: add new feature"');

    // WHEN
    await commandChangelog.handler({
        config: "./git-conventional-commits.yaml",
        file: changelogFile,
    });

    const changelogString = fs.readFileSync(changelogFile).toString();

    // THEN - only the original commit should appear, not the fixup
    expect(changelogString).toMatch(/add new feature/);
    expect(changelogString).not.toMatch(/fixup!/);
});

test("commandChangelog - squash! commit is ignored when referenced commit is in range", async () => {
    // GIVEN
    const changelogFile = "CHANGELOG.md";

    // add init commit
    fs.writeFileSync("text.txt", "0");
    await execAsync("git add text.txt");
    await execAsync("git commit -a -m init");

    // add tag
    const givenVersionTag = "v1.0.0";
    await execAsync(`git tag -a -m ${givenVersionTag} ${givenVersionTag}`);

    // add a conventional commit
    fs.writeFileSync("text.txt", "1");
    await execAsync('git commit -a -m "fix: resolve bug"');

    // add a squash commit referencing the conventional commit
    fs.writeFileSync("text.txt", "2");
    await execAsync('git commit -a -m "squash! fix: resolve bug"');

    // WHEN
    await commandChangelog.handler({
        config: "./git-conventional-commits.yaml",
        file: changelogFile,
    });

    const changelogString = fs.readFileSync(changelogFile).toString();

    // THEN - only the original commit should appear, not the squash
    expect(changelogString).toMatch(/resolve bug/);
    expect(changelogString).not.toMatch(/squash!/);
});

test("commandChangelog - fixup! commit is kept as invalid when referenced commit is not in range", async () => {
    // GIVEN
    const changelogFile = "CHANGELOG.md";

    // add init commit
    fs.writeFileSync("text.txt", "0");
    await execAsync("git add text.txt");
    await execAsync("git commit -a -m init");

    // add a conventional commit that will be before the tag
    fs.writeFileSync("text.txt", "1");
    await execAsync('git commit -a -m "feat: old feature"');

    // add tag - so "feat: old feature" is in a previous release
    const givenVersionTag = "v1.0.0";
    await execAsync(`git tag -a -m ${givenVersionTag} ${givenVersionTag}`);

    // add a fixup commit referencing a commit NOT in the current range
    fs.writeFileSync("text.txt", "2");
    await execAsync('git commit -a -m "fixup! feat: old feature"');

    // WHEN
    await commandChangelog.handler({
        config: "./git-conventional-commits.yaml",
        file: changelogFile,
    });

    const changelogString = fs.readFileSync(changelogFile).toString();

    // THEN - fixup commit is kept (treated as invalid) since referenced commit is not in range
    // With includeInvalidCommits=true (default), it should appear in changelog
    expect(changelogString).not.toMatch(/no relevant changes/);
});

test("commandChangelog - multiple fixup! commits referencing the same commit are all ignored", async () => {
    // GIVEN
    const changelogFile = "CHANGELOG.md";

    // add init commit
    fs.writeFileSync("text.txt", "0");
    await execAsync("git add text.txt");
    await execAsync("git commit -a -m init");

    // add tag
    const givenVersionTag = "v1.0.0";
    await execAsync(`git tag -a -m ${givenVersionTag} ${givenVersionTag}`);

    // add a conventional commit
    fs.writeFileSync("text.txt", "1");
    await execAsync('git commit -a -m "feat: add new feature"');

    // add multiple fixup commits referencing the same conventional commit
    fs.writeFileSync("text.txt", "2");
    await execAsync('git commit -a -m "fixup! feat: add new feature"');

    fs.writeFileSync("text.txt", "3");
    await execAsync('git commit -a -m "fixup! feat: add new feature"');

    // WHEN
    await commandChangelog.handler({
        config: "./git-conventional-commits.yaml",
        file: changelogFile,
    });

    const changelogString = fs.readFileSync(changelogFile).toString();

    // THEN - only the original commit should appear, fixup commits are filtered
    expect(changelogString).toMatch(/add new feature/);
    expect(changelogString).not.toMatch(/fixup!/);
});
