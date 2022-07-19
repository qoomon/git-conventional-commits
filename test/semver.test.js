const {applyChangesToVersion} = require("../lib/semver");

const applyChangesToVersionTest = (versionString, changesString, expectedString) => {
    test(`applyChangesToVersion - ${versionString} + ${changesString} -> ${expectedString}`, async () => {
        // GIVEN
        const p = s => parseInt(s, 10);
        const givenVersionSplit = versionString.split('.').map(p);
        const givenVersion = {
            major: givenVersionSplit[0],
            minor: givenVersionSplit[1],
            patch: givenVersionSplit[2],
        };
        const changeSplit = changesString.split('.').map(p);
        const changes = {
            breaking: changeSplit[0],
            features: changeSplit[1],
            patches: changeSplit[2],
        };

        const expectedVersionSplit = expectedString.split('.').map(p);
        const expectedVersion = {
            major: expectedVersionSplit[0],
            minor: expectedVersionSplit[1],
            patch: expectedVersionSplit[2],
        }

        // WHEN
        applyChangesToVersion(givenVersion, changes);

        // THEN
        expect(givenVersion).toEqual(expectedVersion);
    });
};

// pure changes (either major, minor or patch) to stable version
applyChangesToVersionTest("1.0.0", "0.0.1", "1.0.1");
applyChangesToVersionTest("1.0.0", "0.1.0", "1.1.0");
applyChangesToVersionTest("1.0.0", "1.0.0", "2.0.0");

// mixed changes (at least two of major, minor or patch) to stable version
applyChangesToVersionTest("1.0.0", "0.1.1", "1.1.0");
applyChangesToVersionTest("1.0.0", "1.1.0", "2.0.0");
applyChangesToVersionTest("1.0.0", "1.0.1", "2.0.0");

// pure changes (either major, minor or patch) to development version
applyChangesToVersionTest("0.1.0", "0.0.1", "0.1.1");
applyChangesToVersionTest("0.1.0", "0.1.0", "0.2.0");
applyChangesToVersionTest("0.1.0", "1.0.0", "0.2.0");

// mixed changes (at least two of major, minor or patch) to development version
applyChangesToVersionTest("0.1.0", "0.1.1", "0.2.0");
applyChangesToVersionTest("0.1.0", "1.1.0", "0.2.0");
applyChangesToVersionTest("0.1.0", "1.0.1", "0.2.0");
