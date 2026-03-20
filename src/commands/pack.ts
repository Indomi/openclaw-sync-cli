import { Command } from 'commander';
import chalk from 'chalk';
import { discoverConfig } from '../utils/discovery';
import { createPackArchive } from '../utils/pack';
import { promptSelection } from '../utils/interactive';

export default new Command('pack')
  .description('Pack OpenClaw configuration into archive')
  .option('-o, --output <path>', 'Output archive path', 'openclaw-config.tar.gz')
  .option('-w, --workspaces <names>', 'Comma-separated list of workspaces to include')
  .option('--no-wecom', 'Exclude wecom configuration', false)
  .option('-i, --interactive', 'Interactive selection of what to include', false)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Discovering OpenClaw configuration...'));
      const config = await discoverConfig();
      
      console.log(chalk.green(`Found ${config.workspaces.length} workspace(s)`));
      
      let selectedWorkspaces: string[];
      let includeWecomConfig: boolean = options.wecom;
      
      // Interactive mode or if no workspaces specified
      if (options.interactive || !options.workspaces) {
        const result = await promptSelection(
          config.workspaces,
          !!config.wecomConfigPath
        );
        selectedWorkspaces = result.selectedWorkspaces;
        includeWecomConfig = result.includeWecomConfig;
      } else {
        // CLI mode
        selectedWorkspaces = options.workspaces.split(',').map((s: string) => s.trim());
      }
      
      const includedWorkspaces = config.workspaces.filter(w => 
        selectedWorkspaces.includes(w.name)
      );
      
      if (includedWorkspaces.length === 0) {
        console.log(chalk.yellow('⚠️  No workspaces selected for packing'));
        process.exit(0);
      }
      
      console.log(chalk.blue(`📦 Packing ${includedWorkspaces.length} workspace(s)...`));
      
      const result = await createPackArchive(config.basePath, includedWorkspaces, {
        outputPath: options.output,
        includeWorkspaces: selectedWorkspaces,
        includeWecomConfig
      });
      
      const sizeMB = (result.size / 1024 / 1024).toFixed(2);
      console.log(chalk.green(`✅ Pack completed successfully!`));
      console.log(`   Output: ${chalk.cyan(options.output)}`);
      console.log(`   Files: ${chalk.cyan(result.files)}`);
      console.log(`   Size: ${chalk.cyan(sizeMB + ' MB')}`);
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });
