const Config = require('../lib/commands/config');
const CommitConvention = require('../lib/gitCommitConvention');

// this.parseCommit = parseCommit;
// this.commitLog = getCommitLog;
// this.version = getVersion;

test('parseCommit', async () => {

  // GIVEN
  const conventionConfig = Config.defaultConfig().convention;
  const commitConvention = new CommitConvention(conventionConfig);
  const commit = {
    hash: "1c9d750",
    subject: "feat(ui): new shit",
    body: ''
  };


  // WHEN
  let conventionalCommit = await commitConvention.parseCommit(commit);


  // THEN
  expect(conventionalCommit).toEqual({
    hash: commit.hash,
    type: 'feat',
    scope: 'ui',
    subject: 'new shit',
    body: commit.body,
    breakingChanges: [],
    relatedIssues: []
  })
});

test('parseCommit - breaking changes - description', async () => {

  // GIVEN
  const conventionConfig = Config.defaultConfig().convention;
  const commitConvention = new CommitConvention(conventionConfig);
  const commit = {
    hash: "1c9d750",
    subject: "feat!: Ditch support of windows XP",
    body: ''
  };


  // WHEN
  let conventionalCommit = await commitConvention.parseCommit(commit);


  // THEN
  expect(conventionalCommit).toEqual({
    hash: commit.hash,
    type: 'feat',
    scope: undefined,
    subject: 'Ditch support of windows XP',
    body: commit.body,
    breakingChanges: ["Ditch support of windows XP"],
    relatedIssues: []
  })
});

test('parseCommit - breaking changes - body', async () => {

  // GIVEN
  const conventionConfig = Config.defaultConfig().convention;
  const commitConvention = new CommitConvention(conventionConfig);
  const commit = {
    hash: "1c9d750",
    subject: "feat: new shit",
    body: 'BREAKING CHANGE: Ditch support of windows XP'
  };


  // WHEN
  let conventionalCommit = await commitConvention.parseCommit(commit);


  // THEN
  expect(conventionalCommit).toEqual({
    hash: commit.hash,
    type: 'feat',
    scope: undefined,
    subject: 'new shit',
    body: commit.body,
    breakingChanges: ["Ditch support of windows XP"],
    relatedIssues: []
  })
});

test('parseCommit - issue reference', async () => {

  // GIVEN
  const conventionConfig = Config.defaultConfig().convention;
  conventionConfig.issueRegexPattern = 'PROJECT-[0-9]{3,}';
  const commitConvention = new CommitConvention(conventionConfig);
  const commit = {
    hash: "1c9d750",
    subject: "feat: new shit",
    body: 'relates to PROJECT-123'
  };


  // WHEN
  let conventionalCommit = await commitConvention.parseCommit(commit);


  // THEN
  expect(conventionalCommit).toEqual({
    hash: commit.hash,
    type: 'feat',
    scope: undefined,
    subject: 'new shit',
    body: commit.body,
    breakingChanges: [],
    relatedIssues: ['PROJECT-123']
  })
});