import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { discoverConfig } from '../utils/discovery';
import { createPackArchive } from '../utils/pack';
import { promptSelection } from '../utils/interactive';

export default new Command('backup')
  .description('Backup current OpenClaw configuration with timestamp')
  .option('-o, --output-dir <path>', 'Output backup directory', '~/.openclaw-backups')
  .option('-i, --interactive', 'Interactive selection of what to backup')
  .option('-n, --no-interactive', 'Don\'t interactive, backup everything')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Discovering OpenClaw configuration...'));
      const config = await discoverConfig();
      
      // Expand tilde to home
      let outputDir = options.outputDir.replace(/^~/, os.homedir());
      await fs.ensureDir(outputDir);
      
      // Get selection
      let selectedWorkspaces: string[];
      let includeWecomConfig: boolean;
      
      // interactive defaults to true
      const interactive = options.interactive !== false;
      
      if (interactive) {
        const result = await promptSelection(
          config.workspaces,
          !!config.wecomConfigPath
        );
        selectedWorkspaces = result.selectedWorkspaces;
        includeWecomConfig = result.includeWecomConfig;
      } else {
        selectedWorkspaces = config.workspaces.map(w => w.name);
        includeWecomConfig = !!config.wecomConfigPath;
      }
      
      if (selectedWorkspaces.length === 0) {
        console.log(chalk.yellow('⚠️  No workspaces selected for backup'));
        process.exit(0);
      }
      
      const includedWorkspaces = config.workspaces.filter(w => 
        selectedWorkspaces.includes(w.name)
      );
      
      // Generate timestamp filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `openclaw-backup-${timestamp}.tar.gz`;
      const outputPath = path.join(outputDir, filename);
      
      console.log(chalk.blue(`💾 Backing up ${includedWorkspaces.length} workspace(s)...`));
      
      const result = await createPackArchive(config.basePath, includedWorkspaces, {
        outputPath,
        includeWorkspaces: selectedWorkspaces,
        includeWecomConfig
      });
      
      const sizeMB = (result.size / 1024 / 1024).toFixed(2);
      console.log(chalk.green(`✅ Backup completed successfully!`));
      console.log(`   Backup file: ${chalk.cyan(outputPath)}`);
      console.log(`   Files: ${chalk.cyan(result.files)}`);
      console.log(`   Size: ${chalk.cyan(sizeMB + ' MB')}`);
      
      // Save backup list
      const listPath = path.join(outputDir, 'backups.json');
      let backups: string[] = [];
      if (await fs.exists(listPath)) {
        backups = await fs.readJson(listPath);
      }
      backups.push(outputPath);
      await fs.writeJson(listPath, backups, { spaces: 2 });
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });
