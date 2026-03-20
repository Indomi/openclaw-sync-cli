import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createPackArchive } from './pack';
import { unpackArchive } from './unpack';

describe('pack and unpack integration test', () => {
  const testDir = path.join(os.tmpdir(), 'ocsync-test');
  const testOutput = path.join(os.tmpdir(), 'test-output.tar.gz');
  const unpackDir = path.join(os.tmpdir(), 'ocsync-test-unpack');
  
  beforeAll(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(unpackDir);
    
    // Create a test workspace
    await fs.ensureDir(path.join(testDir, 'workspace-test'));
    await fs.writeFile(path.join(testDir, 'workspace-test', 'test1.txt'), 'Hello World');
    await fs.writeFile(path.join(testDir, 'workspace-test', 'test2.json'), JSON.stringify({ test: true }));
  });
  
  afterAll(async () => {
    await fs.remove(testDir);
    await fs.remove(unpackDir);
    if (await fs.exists(testOutput)) {
      await fs.remove(testOutput);
    }
  });
  
  test('should pack a workspace correctly', async () => {
    const workspaces = [{
      name: 'test',
      path: path.join(testDir, 'workspace-test'),
      files: ['test1.txt', 'test2.json']
    }];
    
    const result = await createPackArchive(testDir, workspaces, {
      outputPath: testOutput,
      includeWorkspaces: ['test'],
      includeWecomConfig: false
    });
    
    expect(result.files).toBe(2);
    expect(result.size).toBeGreaterThan(0);
    expect(await fs.exists(testOutput)).toBe(true);
  });
  
  test('should unpack correctly with no conflicts', async () => {
    // First create the pack
    const workspaces = [{
      name: 'test',
      path: path.join(testDir, 'workspace-test'),
      files: ['test1.txt', 'test2.json']
    }];
    
    await createPackArchive(testDir, workspaces, {
      outputPath: testOutput,
      includeWorkspaces: ['test'],
      includeWecomConfig: false
    });
    
    // Now unpack
    const result = await unpackArchive(testOutput, {
      targetBasePath: unpackDir,
      force: false
    });
    
    expect(result.filesExtracted).toBe(2);
    expect(result.conflicts.length).toBe(0);
    expect(await fs.exists(path.join(unpackDir, 'workspace-test', 'test1.txt'))).toBe(true);
    expect(await fs.readFile(path.join(unpackDir, 'workspace-test', 'test1.txt'), 'utf8'))
      .toBe('Hello World');
    expect(JSON.parse(await fs.readFile(path.join(unpackDir, 'workspace-test', 'test2.json'), 'utf8')))
      .toEqual({ test: true });
  });
  
  test('should detect conflicts and not overwrite', async () => {
    // First pack
    const workspaces = [{
      name: 'test',
      path: path.join(testDir, 'workspace-test'),
      files: ['test1.txt', 'test2.json']
    }];
    
    await createPackArchive(testDir, workspaces, {
      outputPath: testOutput,
      includeWorkspaces: ['test'],
      includeWecomConfig: false
    });
    
    // Create existing file
    await fs.ensureDir(path.join(unpackDir, 'workspace-test'));
    await fs.writeFile(path.join(unpackDir, 'workspace-test', 'test1.txt'), 'Existing content');
    
    // Unpack without force
    const result = await unpackArchive(testOutput, {
      targetBasePath: unpackDir,
      force: false
    });
    
    expect(result.conflicts.length).toBeGreaterThanOrEqual(1); // at least test1 conflicts
    expect(await fs.readFile(path.join(unpackDir, 'workspace-test', 'test1.txt'), 'utf8'))
      .toBe('Existing content'); // still the old content
  });
  
  test('should overwrite conflicts with force', async () => {
    // First pack
    const workspaces = [{
      name: 'test',
      path: path.join(testDir, 'workspace-test'),
      files: ['test1.txt', 'test2.json']
    }];
    
    await createPackArchive(testDir, workspaces, {
      outputPath: testOutput,
      includeWorkspaces: ['test'],
      includeWecomConfig: false
    });
    
    // Create existing file with different content
    await fs.ensureDir(path.join(unpackDir, 'workspace-test'));
    await fs.writeFile(path.join(unpackDir, 'workspace-test', 'test1.txt'), 'Existing content');
    
    // Unpack with force
    const result = await unpackArchive(testOutput, {
      targetBasePath: unpackDir,
      force: true
    });
    
    expect(result.filesExtracted).toBeGreaterThanOrEqual(1);
    // With force=true everything gets extracted regardless of existence
    expect(await fs.readFile(path.join(unpackDir, 'workspace-test', 'test1.txt'), 'utf8'))
      .toBe('Hello World'); // overwritten
  });
});
