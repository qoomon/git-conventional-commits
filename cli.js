#!/usr/bin/env node

const yargs = require('yargs').parserConfiguration({
  'duplicate-arguments-array': false
});

yargs
  .strict()
  .commandDir('./lib/commands')
  .demandCommand(1, 'Missing required argument: command')
  .wrap(120)
  .parse()