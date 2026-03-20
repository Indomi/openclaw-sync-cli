import { findOpenClawBasePath, scanWorkspaces, discoverConfig } from './discovery';

describe('discovery', () => {
  test('findOpenClawBasePath should return a valid path', async () => {
    const path = await findOpenClawBasePath();
    expect(path).toContain('.openclaw');
    expect(path).toBeTruthy();
  });
  
  test('scanWorkspaces should find at least one workspace', async () => {
    const basePath = await findOpenClawBasePath();
    const workspaces = await scanWorkspaces(basePath);
    expect(workspaces.length).toBeGreaterThan(0);
    expect(workspaces[0].name).toBeTruthy();
    expect(workspaces[0].files.length).toBeGreaterThan(0);
  });
  
  test('discoverConfig should return complete config', async () => {
    const config = await discoverConfig();
    expect(config.basePath).toBeTruthy();
    expect(config.workspaces).toBeInstanceOf(Array);
    expect(config.workspaces.length).toBeGreaterThan(0);
  });
});
