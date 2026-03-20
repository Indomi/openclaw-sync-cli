#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import packCommand from './commands/pack';
import unpackCommand from './commands/unpack';
import backupCommand from './commands/backup';
import restoreCommand from './commands/restore';
import listCommand from './commands/list';

const program = new Command();

program
  .name('ocsync')
  .description('OpenClaw Configuration Sync Tool')
  .version('0.1.0');

// Register commands
program.addCommand(packCommand);
program.addCommand(unpackCommand);
program.addCommand(backupCommand);
program.addCommand(restoreCommand);
program.addCommand(listCommand);

// Handle unknown commands
program.on('command:*', () => {
  console.error(
    chalk.red(`Error: Unknown command '${program.args[0]}'`)
  );
  console.log();
  console.log(`Available commands:`);
  program.commands.forEach(cmd => {
    console.log(`  ${chalk.cyan(cmd.name())} - ${cmd.description()}`);
  });
  console.log();
  process.exit(1);
});

program.parse();
