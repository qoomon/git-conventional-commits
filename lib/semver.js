function applyChangesToVersion(version, changes) {
  if (changes.breaking > 0) {
    version.major++;
    version.minor = 0;
    version.patch = 0;
  } else if (changes.feature > 0) {
    version.minor++;
    version.patch = 0;
  } else {
    version.patch++;
  }
}

module.exports = {
  applyChangesToVersion,
};
