function applyChangesToVersion(version, changes) {
  // SemVer 2.0.0 §4: public api should not be considered stable when major version is 0
  if (version.major === 0) {
    // never change major version in development releases
    if (changes.breaking > 0 || changes.feature > 0) {
      version.minor++;
      version.patch = 0;
    } else {
      version.patch++;
    }
  } else {
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
}

module.exports = {
  applyChangesToVersion,
};
