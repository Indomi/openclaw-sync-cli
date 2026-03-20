import fs from 'fs-extra';
import archiver from 'archiver';
import path from 'path';

export interface PackOptions {
  outputPath: string;
  includeWorkspaces: string[];
  includeWecomConfig: boolean;
}

/**
 * Create a packed archive of selected OpenClaw configuration
 */
export async function createPackArchive(
  basePath: string,
  workspaces: {name: string; path: string; files: string[]}[],
  options: PackOptions
): Promise<{size: number; files: number}> {
  const output = fs.createWriteStream(options.outputPath);
  const archive = archiver('tar', {
    gzip: true,
    zlib: { level: 9 }
  });
  
  archive.pipe(output);
  
  let fileCount = 0;
  
  // Add selected workspaces
  for (const workspace of workspaces) {
    if (!options.includeWorkspaces.includes(workspace.name)) {
      continue;
    }
    
    for (const file of workspace.files) {
      const filePath = path.join(workspace.path, file);
      const archivePath = path.join('workspace-' + workspace.name, file);
      archive.file(filePath, { name: archivePath });
      fileCount++;
    }
  }
  
  // Add wecom config if requested
  if (options.includeWecomConfig) {
    const wecomPath = path.join(basePath, 'wecomConfig', 'config.json');
    if (await fs.pathExists(wecomPath)) {
      archive.file(wecomPath, { name: 'wecomConfig/config.json' });
      fileCount++;
    }
  }
  
  await archive.finalize();
  
  return new Promise((resolve) => {
    output.on('close', () => {
      resolve({
        size: archive.pointer(),
        files: fileCount
      });
    });
  });
}
