const fs = require("fs");
const path = require("path");
const temp = require("tmp-promise");
const execAsync = require("../../lib/execAsync");
const YAML = require('yaml')
const yargs = require('yargs/yargs');

const commandChangelog = require("../../lib/commands/commandChangelog");

const originalDirectory = process.cwd();
let tempDirectory;

beforeEach(async () => {
    tempDirectory = await temp.dir({unsafeCleanup: true});
    process.chdir(tempDirectory.path);

    await execAsync("git init");

    const config = {}
    fs.writeFileSync("git-conventional-commits.yaml", YAML.stringify(config), 'utf8');
});

afterEach(async () => {
    process.chdir(originalDirectory);
    await tempDirectory.cleanup();
});

test.each([
    ["defaults", [], undefined, "HEAD"],
    ["explicit anchors", ["--base", "1234567", "--commit", "preview-end"], "1234567", "preview-end"],
])("commandChangelog - parses %s", (name, args, base, commit) => {
    const parser = yargs();
    commandChangelog.builder(parser);
    const argv = parser.parse(args);

    expect(argv.base).toBe(base);
    expect(argv.commit).toBe(commit);
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

const createPrereleaseHistory = async () => {
    fs.writeFileSync("text.txt", "0");
    await execAsync("git add text.txt");
    await execAsync('git commit -a -m "feat: initial release"');
    await execAsync("git tag -a -m v1.0.0 v1.0.0");

    fs.writeFileSync("text.txt", "1");
    await execAsync('git commit -a -m "feat!: add feature A"');
    await execAsync("git tag -a -m v2.0.0-next.1 v2.0.0-next.1");
    await execAsync("git tag v2.0.0-next.1-lightweight");
    await execAsync("git branch prerelease-base");
    const hash = (await execAsync("git rev-parse HEAD")).trim();

    fs.writeFileSync("text.txt", "2");
    await execAsync('git commit -a -m "fix: add feature B"');
    await execAsync("git tag -a -m v2.0.0-next.2 v2.0.0-next.2");

    fs.writeFileSync("text.txt", "3");
    await execAsync('git commit -a -m "fix: add feature C"');

    return {
        tag: "v2.0.0-next.1",
        lightweight: "v2.0.0-next.1-lightweight",
        branch: "prerelease-base",
        hash,
    };
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

test.each(["tag", "lightweight", "branch", "hash"])("commandChangelog - explicit %s base and end", async (baseType) => {
    const changelogFile = "CHANGELOG.md";
    const baseAnchors = await createPrereleaseHistory();

    await commandChangelog.handler({
        config: "./git-conventional-commits.yaml",
        commit: "v2.0.0-next.2",
        base: baseAnchors[baseType],
        release: "v2.0.0-next.2",
        file: changelogFile,
    });
    const changelogString = fs.readFileSync(changelogFile).toString();

    expect(changelogString).toMatch(/add feature B/);
    expect(changelogString).not.toMatch(/add feature A/);
    expect(changelogString).not.toMatch(/add feature C/);
});

test.each(["tag", "lightweight", "branch", "hash"])("commandChangelog - %s base without --release preserves inferred version", async (baseType) => {
    const baseAnchors = await createPrereleaseHistory();
    const base = baseAnchors[baseType];
    const cli = path.resolve(__dirname, "../../cli.js");
    const output = await execAsync(`"${process.execPath}" "${cli}" changelog --base ${base}`);

    expect(output).toMatch(/^## \*\*2\.0\.0\*\*/);
    expect(output).not.toMatch(/add feature A/);
    expect(output).toMatch(/add feature B/);
    expect(output).toMatch(/add feature C/);

    await commandChangelog.handler({base, file: "CHANGELOG.md"});
    expect(fs.readFileSync("CHANGELOG.md").toString().trim()).toBe(output.trim());
});

test.each([
    ["HEAD", undefined],
    ["v2.0.0-next.2", "v2.0.0-next.2"],
    ["prerelease-end", "v2.0.0-next.2"],
])("commandChangelog - equal base %s and end produce an empty changelog", async (base, commit) => {
    await createPrereleaseHistory();
    await execAsync("git branch prerelease-end v2.0.0-next.2");

    await commandChangelog.handler({
        base,
        commit,
        release: "2.0.0-next.3",
        name: "Preview",
        file: "CHANGELOG.md",
    });

    expect(fs.readFileSync("CHANGELOG.md").toString()).toBe(
        "## **2.0.0-next.3 - Preview**\n\n*no relevant changes*\n<br>\n\n"
    );
});

test("commandChangelog - equal hash base and tagged end without --release", async () => {
    await createPrereleaseHistory();
    const base = (await execAsync("git rev-parse v2.0.0-next.2^{}")).trim();
    const cli = path.resolve(__dirname, "../../cli.js");
    const output = await execAsync(`"${process.execPath}" "${cli}" changelog --base ${base} --commit v2.0.0-next.2`);

    await commandChangelog.handler({
        base,
        commit: "v2.0.0-next.2",
        file: "CHANGELOG.md",
    });

    expect(fs.readFileSync("CHANGELOG.md").toString()).toBe(
        "## **2.0.0**\n\n*no relevant changes*\n<br>\n\n"
    );
    expect(output.trim()).toBe(fs.readFileSync("CHANGELOG.md").toString().trim());
});

test("commandChangelog - empty changelog can be printed and prepended", async () => {
    await createPrereleaseHistory();
    const changelog = "## **2.0.0**\n\n*no relevant changes*\n<br>\n\n";
    fs.writeFileSync("CHANGELOG.md", "Older entry\n");

    await commandChangelog.handler({base: "HEAD", file: "CHANGELOG.md"});
    expect(fs.readFileSync("CHANGELOG.md").toString()).toBe(changelog + "Older entry\n");

    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
        await commandChangelog.handler({base: "HEAD"});
        expect(log).toHaveBeenCalledTimes(1);
        expect(log).toHaveBeenCalledWith(changelog);
    } finally {
        log.mockRestore();
    }
});

test("commandChangelog - hash base without a full release tag", async () => {
    const baseAnchors = await createPrereleaseHistory();
    await execAsync("git tag -d v1.0.0");

    await commandChangelog.handler({base: baseAnchors.hash, file: "CHANGELOG.md"});
    const changelogString = fs.readFileSync("CHANGELOG.md").toString();

    expect(changelogString).toMatch(/^## \*\*0\.1\.0\*\*/);
    expect(changelogString).not.toMatch(/add feature A/);
    expect(changelogString).toMatch(/add feature B/);
    expect(changelogString).toMatch(/add feature C/);
});

test.each(["", "--release 2.0.0-next.3"])("commandChangelog - invalid base fails with %s", async (release) => {
    await createPrereleaseHistory();
    const cli = path.resolve(__dirname, "../../cli.js");

    await expect(execAsync(
        `"${process.execPath}" "${cli}" changelog --base missing-base ${release}`
    )).rejects.toMatchObject({code: 1});
});

test("commandChangelog - omitted base retains previous-release fallback at a release tag", async () => {
    await createPrereleaseHistory();
    await execAsync("git tag -a -m v2.0.0 v2.0.0 v2.0.0-next.2");

    await commandChangelog.handler({
        commit: "v2.0.0",
        file: "CHANGELOG.md",
    });
    const changelogString = fs.readFileSync("CHANGELOG.md").toString();

    expect(changelogString).toMatch(/^## \*\*2\.0\.0\*\*/);
    expect(changelogString).toMatch(/add feature A/);
    expect(changelogString).toMatch(/add feature B/);
    expect(changelogString).not.toMatch(/add feature C/);
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
