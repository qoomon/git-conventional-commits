const fs = require("fs");
const path = require("path");
const temp = require("tmp-promise");
const execAsync = require("../lib/execAsync");

const commandChangelog = require("../lib/commands/commandChangelog");

beforeEach(async () => {
  const gitDir = await temp.dir();
  process.chdir(gitDir.path);
  await execAsync("git init");
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
    config: path.resolve(__dirname, "../git-conventional-commits.default.json"),
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
