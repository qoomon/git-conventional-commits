const config = require("../../lib/commands/config");


test("config - message RegEx", async () => {
    // GIVEN
    const requiredCaptureGroups = ['type', 'scope', 'breaking', 'description'];
    

    // WHEN
    const validMsgRegex = /^(?<type>\w+)(?:\((?<scope>[^()]+)\))?(?<breaking>!)?:\s*(?<description>.+)/i;
    const invalidMsgRegex = /(?:\((?<scope>[^()]+)\))?(?<breaking>!)?:\s*(?<description>.+)/i;

    // THEN
    expect(config.hasMandatoryCaptureGroups(validMsgRegex, requiredCaptureGroups)).toBe(true);
    expect(config.hasMandatoryCaptureGroups(invalidMsgRegex, requiredCaptureGroups)).toBe(false);
});

test("config - merge RegEx", async () => {
    // GIVEN
    const requiredCaptureGroups = ['description'];
    

    // WHEN
    const validMsgRegex = /^Merge (?<description>.+)/i; 
    const invalidMsgRegex = /^Merge (?<type>.+)/i;

    // THEN
    expect(config.hasMandatoryCaptureGroups(validMsgRegex, requiredCaptureGroups)).toBe(true);
    expect(config.hasMandatoryCaptureGroups(invalidMsgRegex, requiredCaptureGroups)).toBe(false); 
});


