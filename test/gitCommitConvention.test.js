const Config = require('../lib/commands/config');
const CommitConvention = require('../lib/gitCommitConvention');

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
        subject: commit.subject,
        body: commit.body,
        type: 'feat',
        scope: 'ui',
        description: 'new shit',
        breakingChanges: [],
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
        subject: commit.subject,
        body: commit.body,
        type: 'feat',
        scope: undefined,
        description: 'Ditch support of windows XP',
        breakingChanges: ["Ditch support of windows XP"],
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
        subject: commit.subject,
        body: commit.body,
        type: 'feat',
        scope: undefined,
        description: 'new shit',
        breakingChanges: ["Ditch support of windows XP"],
    })
});
