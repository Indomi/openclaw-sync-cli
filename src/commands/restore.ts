import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import { unpackArchive } from '../utils/unpack';
import { findOpenClawBasePath } from '../utils/discovery';

export default new Command('restore')
  .description('Restore OpenClaw configuration from backup')
  .argument('[backup-path]', 'Backup file to restore (uses latest from backup dir if omitted)')
  .option('-f, --force', 'Force overwrite existing configuration', false)
  .option('-d, --backup-dir <path>', 'Backup directory', '~/.openclaw-backups')
  .action(async (backupPath, options) => {
    try {
      const basePath = await findOpenClawBasePath();
      const backupDir = options.backupDir.replace(/^~/, os.homedir());
      
      // If no backup path specified, list available backups and let user choose
      let selectedBackup: string;
      
      if (!backupPath) {
        const listPath = path.join(backupDir, 'backups.json');
        if (!await fs.exists(listPath)) {
          console.error(chalk.red(`❌ No backups found in ${backupDir}`));
          process.exit(1);
        }
        
        const backups: string[] = await fs.readJson(listPath);
        if (backups.length === 0) {
          console.error(chalk.red(`❌ No backups found in ${backupDir}`));
          process.exit(1);
        }
        
        // Sort by name (timestamp in name), get latest
        backups.sort().reverse();
        
        const { backup } = await inquirer.prompt([{
          type: 'list',
          name: 'backup',
          message: 'Select a backup to restore:',
          choices: backups.map((b, i) => ({
            name: i === 0 ? `${path.basename(b)} (latest)` : path.basename(b),
            value: b
          }))
        }]);
        
        selectedBackup = backup;
      } else {
        // Check if it's just a filename in the backup dir
        const fullPath = path.isAbsolute(backupPath)
          ? backupPath
          : path.join(backupDir, backupPath);
        
        if (!await fs.exists(fullPath)) {
          console.error(chalk.red(`❌ Backup not found: ${fullPath}`));
          process.exit(1);
        }
        
        selectedBackup = fullPath;
      }
      
      console.log(chalk.blue(`📂 Restoring from backup: ${chalk.cyan(selectedBackup)}`));
      console.log(chalk.blue(`📂 Target: ${chalk.cyan(basePath)}`));
      
      // Same conflict handling as unpack
      console.log(chalk.blue(`🔍 Checking for conflicts...`));
      const initialResult = await unpackArchive(selectedBackup, {
        targetBasePath: basePath,
        force: false
      });
      
      if (initialResult.conflicts.length === 0) {
        console.log(chalk.blue(`📂 Restoring...`));
        const result = await unpackArchive(selectedBackup, {
          targetBasePath: basePath,
          force: true
        });
        console.log(chalk.green(`✅ Restore completed!`));
        console.log(`   Files restored: ${chalk.cyan(result.filesExtracted)}`);
        return;
      }
      
      if (options.force) {
        console.log(chalk.blue(`📂 Restoring with force overwrite...`));
        const result = await unpackArchive(selectedBackup, {
          targetBasePath: basePath,
          force: true
        });
        console.log(chalk.green(`✅ Restore completed!`));
        console.log(`   Files restored: ${chalk.cyan(result.filesExtracted)}`);
        console.log(chalk.yellow(`⚠️  Overwrote ${result.conflicts.length} file(s)`));
        return;
      }
      
      // Interactive conflict resolution
      console.log(chalk.yellow(`⚠️  Found ${initialResult.conflicts.length} existing file(s):`));
      console.log();
      
      type ConflictAction = 'overwrite' | 'keep' | 'overwrite-all' | 'keep-all';
      let globalAction: ConflictAction | null = null;
      const overwriteFiles: string[] = [];
      
      for (const conflict of initialResult.conflicts) {
        if (globalAction === 'overwrite-all') {
          overwriteFiles.push(conflict);
          continue;
        }
        if (globalAction === 'keep-all') {
          continue;
        }
        
        const { action } = await inquirer.prompt([{
          type: 'list',
          name: 'action',
          message: `Conflict: ${conflict}\nWhat would you like to do?`,
          choices: [
            { name: 'Overwrite this file', value: 'overwrite' },
            { name: 'Keep existing file (skip)', value: 'keep' },
            { name: 'Overwrite all files', value: 'overwrite-all' },
            { name: 'Keep all existing files', value: 'keep-all' }
          ]
        }]);
        
        globalAction = action as ConflictAction;
        
        if (action === 'overwrite' || action === 'overwrite-all') {
          overwriteFiles.push(conflict);
        }
      }
      
      console.log();
      console.log(chalk.blue(`📂 Restoring...`));
      
      // Unpack with selective overwrite
      const forceMap = new Set(overwriteFiles);
      let filesExtracted = 0;
      let conflictsSkipped = 0;
      
      const result = await new Promise<{filesExtracted: number; conflicts: number}>((resolve, reject) => {
        const { createGunzip } = require('zlib');
        const tar = require('tar-fs');
        const fs = require('fs-extra');
        const path = require('path');
        
        let filesExtracted = 0;
        let conflictsSkipped = 0;
        
        const readStream = fs.createReadStream(selectedBackup);
        const gunzip = createGunzip();
        const extract = tar.extract(basePath, {
          ignore: (name: string, header: any) => {
            if (header!.type !== 'file') {
              return false;
            }
            
            const entryPath = path.join(basePath, header!.name!);
            
            if (fs.existsSync(entryPath) && !forceMap.has(header!.name!)) {
              conflictsSkipped++;
              return true;
            }
            
            filesExtracted++;
            return false;
          }
        });
        
        readStream
          .pipe(gunzip)
          .pipe(extract)
          .on('finish', () => resolve({ filesExtracted, conflicts: conflictsSkipped }))
          .on('error', reject);
      });
      
      console.log(chalk.green(`✅ Restore completed!`));
      console.log(`   Files restored: ${chalk.cyan(result.filesExtracted)}`);
      console.log(`   Files skipped (kept existing): ${chalk.cyan(result.conflicts)}`);
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });
