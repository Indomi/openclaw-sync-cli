import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import { findOpenClawBasePath } from '../utils/discovery';
import { unpackArchive } from '../utils/unpack';

type ConflictAction = 'overwrite' | 'keep' | 'overwrite-all' | 'keep-all';

export default new Command('unpack')
  .description('Unpack OpenClaw configuration from archive')
  .argument('<archive>', 'Archive file to unpack')
  .option('-f, --force', 'Force overwrite all existing configuration', false)
  .action(async (archive, options) => {
    try {
      const basePath = await findOpenClawBasePath();
      console.log(chalk.blue(`📂 Target OpenClaw directory: ${chalk.cyan(basePath)}`));
      
      if (!await fs.exists(archive)) {
        console.error(chalk.red(`❌ Archive not found: ${archive}`));
        process.exit(1);
      }
      
      // First pass to find all conflicts
      console.log(chalk.blue(`🔍 Checking for conflicts...`));
      const initialResult = await unpackArchive(archive, {
        targetBasePath: basePath,
        force: false // don't overwrite anything yet
      });
      
      if (initialResult.conflicts.length === 0) {
        // No conflicts, just extract everything
        console.log(chalk.blue(`📂 Unpacking...`));
        const result = await unpackArchive(archive, {
          targetBasePath: basePath,
          force: true
        });
        console.log(chalk.green(`✅ Unpack completed!`));
        console.log(`   Files extracted: ${chalk.cyan(result.filesExtracted)}`);
        return;
      }
      
      // If --force is given, just overwrite everything
      if (options.force) {
        console.log(chalk.blue(`📂 Unpacking with force overwrite...`));
        const result = await unpackArchive(archive, {
          targetBasePath: basePath,
          force: true
        });
        console.log(chalk.green(`✅ Unpack completed!`));
        console.log(`   Files extracted: ${chalk.cyan(result.filesExtracted)}`);
        console.log(chalk.yellow(`⚠️  Overwrote ${result.conflicts.length} file(s)`));
        return;
      }
      
      // Interactive conflict resolution
      console.log(chalk.yellow(`⚠️  Found ${initialResult.conflicts.length} existing file(s):`));
      console.log();
      
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
      console.log(chalk.blue(`📂 Unpacking...`));
      
      // We need to do a full unpack with force=true but we already know which to overwrite
      // Since tar doesn't support selective extract based on decision, just do full unpack with force for selected
      // For simplicity just unpack everything and let it overwrite the selected ones
      const forceMap = new Set(overwriteFiles);
      let totalExtracted = 0;
      
      // Actually need to unpack again, because first pass skipped everything
      const result = await new Promise<{filesExtracted: number; conflicts: string[]}>((resolve, reject) => {
        const { createGunzip } = require('zlib');
        const tar = require('tar-fs');
        const fs = require('fs-extra');
        const path = require('path');
        
        let filesExtracted = 0;
        const conflicts: string[] = [];
        
        const readStream = fs.createReadStream(archive);
        const gunzip = createGunzip();
        const extract = tar.extract(basePath, {
          ignore: (name: string, header: any) => {
            const entryPath = path.join(basePath, header!.name!);
            
            if (header!.type !== 'file') {
              return false;
            }
            
            if (fs.existsSync(entryPath) && !forceMap.has(header!.name!)) {
              conflicts.push(header!.name!);
              return true;
            }
            
            filesExtracted++;
            return false;
          }
        });
        
        readStream
          .pipe(gunzip)
          .pipe(extract)
          .on('finish', () => resolve({ filesExtracted, conflicts }))
          .on('error', reject);
      });
      
      console.log(chalk.green(`✅ Unpack completed!`));
      console.log(`   Files extracted: ${chalk.cyan(result.filesExtracted)}`);
      console.log(`   Files skipped (kept existing): ${chalk.cyan(result.conflicts.length)}`);
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });