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
        new RegExp(`Bug Fixes\\s+\\*\\s+${commitMessage}`, "g")
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
        new RegExp(`BREAKING CHANGES\\s+\\*\\s+${commitBodyMessage}`, "g")
    );
});
