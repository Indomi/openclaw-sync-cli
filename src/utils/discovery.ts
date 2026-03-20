import fs from 'fs-extra';
import path from 'path';

export interface OpenClawWorkspace {
  name: string;
  path: string;
  files: string[];
}

export interface OpenClawConfig {
  basePath: string;
  workspaces: OpenClawWorkspace[];
  wecomConfigPath: string | null;
}

/**
 * Find OpenClaw configuration directory
 */
export async function findOpenClawBasePath(): Promise<string> {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    throw new Error('Could not find home directory');
  }
  const basePath = path.join(home, '.openclaw');
  await fs.ensureDir(basePath);
  return basePath;
}

/**
 * Scan for all workspaces in OpenClaw
 */
export async function scanWorkspaces(basePath: string): Promise<OpenClawWorkspace[]> {
  const workspaces: OpenClawWorkspace[] = [];
  const entries = await fs.readdir(basePath);
  
  for (const entry of entries) {
    const fullPath = path.join(basePath, entry);
    const stat = await fs.stat(fullPath);
    
    if (stat.isDirectory() && entry.startsWith('workspace-')) {
      const name = entry.slice('workspace-'.length);
      const files = await scanWorkspaceFiles(fullPath);
      workspaces.push({
        name,
        path: fullPath,
        files
      });
    }
  }
  
  return workspaces.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Scan all files in a workspace (excludes node_modules, .git, dist etc.)
 */
async function scanWorkspaceFiles(workspacePath: string): Promise<string[]> {
  const files: string[] = [];
  const excludeDirs = new Set(['node_modules', '.git', 'dist', 'build', '.npm', '.yarn']);
  
  async function walk(dir: string) {
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.has(entry)) {
          await walk(fullPath);
        }
      } else {
        const relative = path.relative(workspacePath, fullPath);
        files.push(relative);
      }
    }
  }
  
  await walk(workspacePath);
  return files;
}

/**
 * Check if wecom config exists
 */
export async function findWecomConfig(basePath: string): Promise<string | null> {
  const wecomPath = path.join(basePath, 'wecomConfig', 'config.json');
  const exists = await fs.pathExists(wecomPath);
  return exists ? wecomPath : null;
}

/**
 * Discover complete OpenClaw configuration
 */
export async function discoverConfig(): Promise<OpenClawConfig> {
  const basePath = await findOpenClawBasePath();
  const workspaces = await scanWorkspaces(basePath);
  const wecomConfigPath = await findWecomConfig(basePath);
  
  return {
    basePath,
    workspaces,
    wecomConfigPath
  };
}
