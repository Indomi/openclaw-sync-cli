import { Command } from 'commander';
import chalk from 'chalk';
import { discoverConfig } from '../utils/discovery';

export default new Command('list')
  .description('List current OpenClaw configuration items')
  .action(async () => {
    try {
      const config = await discoverConfig();
      
      console.log(chalk.bold.blue('📋 OpenClaw Configuration'));
      console.log();
      console.log(`${chalk.bold('Base Path:')} ${chalk.cyan(config.basePath)}`);
      console.log();
      
      console.log(chalk.bold(`Workspaces (${config.workspaces.length}):`));
      console.log();
      
      if (config.workspaces.length === 0) {
        console.log('  No workspaces found');
      } else {
        config.workspaces.forEach(workspace => {
          console.log(`  ${chalk.green('●')} ${chalk.cyan(workspace.name)}`);
          console.log(`    Path: ${workspace.path}`);
          console.log(`    Files: ${workspace.files.length}`);
          console.log();
        });
      }
      
      if (config.wecomConfigPath) {
        console.log(chalk.bold('WeChat Work Config:'));
        console.log(`  Path: ${chalk.cyan(config.wecomConfigPath)}`);
        console.log();
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });
