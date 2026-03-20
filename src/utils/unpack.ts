import fs from 'fs-extra';
import tar from 'tar-fs';
import zlib from 'zlib';
import path from 'path';

export interface UnpackOptions {
  targetBasePath: string;
  force: boolean;
}

/**
 * Unpack an archive to OpenClaw configuration
 */
export async function unpackArchive(
  archivePath: string,
  options: UnpackOptions
): Promise<{filesExtracted: number; conflicts: string[]}> {
  const { targetBasePath, force } = options;
  const conflicts: string[] = [];
  let filesExtracted = 0;
  
  await fs.ensureDir(targetBasePath);
  
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(archivePath);
    const gunzip = zlib.createGunzip();
    
    const extract = tar.extract(targetBasePath, {
      ignore: (name: string, header: any) => {
        const entryPath = path.join(targetBasePath, header!.name!);
        
        if (header!.type === 'file' && fs.existsSync(entryPath) && !force) {
          conflicts.push(header!.name!);
          return true; // ignore this file (conflict)
        }
        
        if (header!.type === 'file') {
          filesExtracted++;
        }
        return false; // don't ignore
      }
    });
    
    readStream
      .pipe(gunzip)
      .pipe(extract)
      .on('finish', () => {
        resolve({
          filesExtracted,
          conflicts
        });
      })
      .on('error', reject);
  });
}
