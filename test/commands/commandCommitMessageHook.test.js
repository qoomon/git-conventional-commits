const fs = require("fs");
const temp = require("tmp-promise");
const execAsync = require("../../lib/execAsync");
const YAML = require('yaml');

const commandCommitMessageHook = require("../../lib/commands/commandCommitMessageHook");

let originalCwd;

beforeEach(async () => {
    originalCwd = process.cwd();
    const tempDirectory = await temp.dir();
    process.chdir(tempDirectory.path);

    await execAsync("git init");

    const config = {};
    fs.writeFileSync("git-conventional-commits.yaml", YAML.stringify(config), 'utf8');

    // Create an initial commit so git log works
    fs.writeFileSync("text.txt", "0");
    await execAsync("git add text.txt");
    await execAsync('git commit -a -m "feat: initial feature"');
});

afterEach(() => {
    process.chdir(originalCwd);
});

const runHook = async (commitSubject) => {
    const commitMsgFile = "COMMIT_EDITMSG";
    fs.writeFileSync(commitMsgFile, commitSubject);

    return commandCommitMessageHook.handler({
        commitMsgFile,
        config: "./git-conventional-commits.yaml",
    });
};

test("commit-msg-hook - fixup! commit is allowed when matching commit exists", async () => {
    // GIVEN - "feat: initial feature" already exists from beforeEach

    // WHEN / THEN - should not throw or exit
    await expect(runHook("fixup! feat: initial feature")).resolves.toBeUndefined();
});

test("commit-msg-hook - fixup! commit with prefix match is allowed", async () => {
    // GIVEN - "feat: initial feature" already exists from beforeEach

    // WHEN / THEN - "feat: initial" is a prefix of "feat: initial feature"
    await expect(runHook("fixup! feat: initial")).resolves.toBeUndefined();
});

test("commit-msg-hook - squash! commit is allowed when matching commit exists", async () => {
    // GIVEN - "feat: initial feature" already exists from beforeEach

    // WHEN / THEN - should not throw or exit
    await expect(runHook("squash! feat: initial feature")).resolves.toBeUndefined();
});

test("commit-msg-hook - fixup! commit is rejected when no matching commit exists", async () => {
    // GIVEN - no commit with subject starting with "feat: nonexistent" exists

    // WHEN / THEN - should call process.exit(2)
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
    });
    const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(runHook("fixup! feat: nonexistent feature")).rejects.toThrow('process.exit called');

    expect(mockExit).toHaveBeenCalledWith(2);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining("No matching commit found"));

    mockExit.mockRestore();
    mockError.mockRestore();
});

test("commit-msg-hook - squash! commit is rejected when no matching commit exists", async () => {
    // GIVEN - no commit with subject starting with "fix: nonexistent" exists

    // WHEN / THEN - should call process.exit(2)
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
    });
    const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(runHook("squash! fix: nonexistent bug")).rejects.toThrow('process.exit called');

    expect(mockExit).toHaveBeenCalledWith(2);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining("No matching commit found"));

    mockExit.mockRestore();
    mockError.mockRestore();
});
