const Config = require('../lib/commands/config');
const CommitConvention = require('../lib/gitCommitConvention');

describe('getFixupSquashReferenceSubject', () => {
    test('returns undefined for regular commit', () => {
        expect(CommitConvention.getFixupSquashReferenceSubject('feat: add feature')).toBeUndefined();
    });

    test('returns referenced subject for fixup! commit', () => {
        expect(CommitConvention.getFixupSquashReferenceSubject('fixup! feat: add feature')).toBe('feat: add feature');
    });

    test('returns referenced subject for squash! commit', () => {
        expect(CommitConvention.getFixupSquashReferenceSubject('squash! feat: add feature')).toBe('feat: add feature');
    });

    test('returns undefined for commit starting with fixup without exclamation', () => {
        expect(CommitConvention.getFixupSquashReferenceSubject('fixup something')).toBeUndefined();
    });

    test('returns undefined for commit starting with squash without exclamation', () => {
        expect(CommitConvention.getFixupSquashReferenceSubject('squash something')).toBeUndefined();
    });
});

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
