#!/bin/sh

if command -v git-conventional-commits > /dev/null 2>&1
then
  # fix for windows systems
  PATH="/c/Program Files/nodejs:$HOME/AppData/Roaming/npm/:$PATH"
  git-conventional-commits commit-msg-hook "$1"
fi