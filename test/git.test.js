const fs = require('fs');
const temp = require('tmp-promise');
const execAsync = require('../lib/execAsync');


const Git = require('../lib/git');


beforeEach(async () => {
    const gitDir = await temp.dir();
    process.chdir(gitDir.path);
    await execAsync('git init');
});


test('getLastTag', async () => {

    // GIVEN

    // add commit 0
    fs.writeFileSync('text.txt', 'Lorem ipsum 0');
    await execAsync('git add text.txt');
    await execAsync('git commit -a -m init');

    // add commit 1
    fs.writeFileSync('text.txt', 'Lorem ipsum 1');
    await execAsync('git commit -a -m "update 1"');

    // add tag 1
    const givenVersionTag1 = 'v1.0.0';
    await execAsync(`git tag -a -m ${givenVersionTag1} ${givenVersionTag1}`);

    // add commit 2
    fs.writeFileSync('text.txt', 'Lorem ipsum 2');
    await execAsync('git commit -a -m "update 2"');

    // add tag 2
    const givenVersionTag2 = 'v2.0.0';
    await execAsync(`git tag -a -m ${givenVersionTag2} ${givenVersionTag2}`);


    // WHEN
    let lastVersionTag = await Git.getLastTag('v*');


    // THEN
    expect(lastVersionTag).toBe(givenVersionTag2)
});

test('getLastTag - skipTagOnRev=false', async () => {

    // GIVEN

    // add commit 0
    fs.writeFileSync('text.txt', 'Lorem ipsum 0');
    await execAsync('git add text.txt');
    await execAsync('git commit -a -m init');

    // add commit 1
    fs.writeFileSync('text.txt', 'Lorem ipsum 1');
    await execAsync('git commit -a -m "update 1"');

    // add tag 1
    const givenVersionTag1 = 'v1.0.0';
    await execAsync(`git tag -a -m ${givenVersionTag1} ${givenVersionTag1}`);

    // add commit 2
    fs.writeFileSync('text.txt', 'Lorem ipsum 2');
    await execAsync('git commit -a -m "update 2"');

    // add tag 2
    const givenVersionTag2 = 'v2.0.0';
    await execAsync(`git tag -a -m ${givenVersionTag2} ${givenVersionTag2}`);


    // WHEN
    let lastVersionTag = await Git.getLastTag('v*', 'HEAD', false);


    // THEN
    expect(lastVersionTag).toBe(givenVersionTag2)
});

test('commitLog', async () => {

    // GIVEN

    // add commit 0
    fs.writeFileSync('text.txt', 'Lorem ipsum 0');
    await execAsync('git add text.txt');
    await execAsync('git commit -a -m init');

    // add commit 1
    fs.writeFileSync('text.txt', 'Lorem ipsum 1');
    await execAsync('git commit -a -m "update 1"');

    // add tag 1
    const givenVersionTag1 = 'v1.0.0';
    await execAsync(`git tag -a -m ${givenVersionTag1} ${givenVersionTag1}`);

    // add commit 2
    fs.writeFileSync('text.txt', 'Lorem ipsum 2');
    await execAsync('git commit -a -m "update 2"');

    // add commit 3
    fs.writeFileSync('text.txt', 'Lorem ipsum 3');
    await execAsync('git commit -a -m "update 3"');


    // WHEN
    let gitCommitLog = await Git.getCommitLog(givenVersionTag1);


    // THEN
    expect(gitCommitLog.length).toBe(2);
    expect(gitCommitLog[0]).toEqual({
        hash: expect.any(String),
        date: expect.any(Date),
        body: '',
        subject: 'update 2'
    });

    expect(gitCommitLog[1]).toEqual({
        hash: expect.any(String),
        date: expect.any(Date),
        body: '',
        subject: 'update 3'
    })
});
