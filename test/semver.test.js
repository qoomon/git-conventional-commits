const {applyChangesToVersion} = require("../lib/semver");

const createApplyChangesTest = (versionString, changesString, expectedString) => {
    test(`applyChangesToVersion - ${versionString} + ${changesString} -> ${expectedString}`, async () => {
        // GIVEN
        const p = s => parseInt(s, 10);
        const v = versionString.split('.').map(p);
        const c = changesString.split('.').map(p);
        const e = expectedString.split('.').map(p);
        const version = {
            major: v[0],
            minor: v[1],
            patch: v[2],
        };
        const changes = {
            breaking: c[0],
            feature: c[1],
            patch: c[2],
        };


        // WHEN
        applyChangesToVersion(version, changes);


        // THEN
        expect(version).toEqual({
            major: e[0],
            minor: e[1],
            patch: e[2],
        });
    });
};

// XXX
// createApplyChangesTest("1.0.0", "0.0.0", "1.0.0");

// pure changes (either major, minor or patch) to stable version
createApplyChangesTest("1.0.0", "0.0.1", "1.0.1");
createApplyChangesTest("1.0.0", "0.1.0", "1.1.0");
createApplyChangesTest("1.0.0", "1.0.0", "2.0.0");

// mixed changes (at least two of major, minor or patch) to stable version
createApplyChangesTest("1.0.0", "0.1.1", "1.1.0");
createApplyChangesTest("1.0.0", "1.1.0", "2.0.0");
createApplyChangesTest("1.0.0", "1.0.1", "2.0.0");

// pure changes (either major, minor or patch) to development version
createApplyChangesTest("0.1.0", "0.0.1", "0.1.1");
createApplyChangesTest("0.1.0", "0.1.0", "0.2.0");
createApplyChangesTest("0.1.0", "1.0.0", "0.2.0");

// mixed changes (at least two of major, minor or patch) to development version
createApplyChangesTest("0.1.0", "0.1.1", "0.2.0");
createApplyChangesTest("0.1.0", "1.1.0", "0.2.0");
createApplyChangesTest("0.1.0", "1.0.1", "0.2.0");
