import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'dev-runner-cache-'));
const packagesDir = path.join(fixtureRoot, 'packages');
const pkgA = path.join(packagesDir, 'a');
mkdirSync(pkgA, { recursive: true });
writeFileSync(
  path.join(fixtureRoot, 'package.json'),
  JSON.stringify({ name: 'cache-root' }),
  'utf8'
);
writeFileSync(
  path.join(pkgA, 'package.json'),
  JSON.stringify({ name: 'pkg-a' }),
  'utf8'
);

process.env.DEV_RUNNER_ROOT = fixtureRoot;
process.env.DEV_RUNNER_PACKAGES = packagesDir;
process.env.DEV_RUNNER_STATE = path.join(fixtureRoot, '.state');
mkdirSync(process.env.DEV_RUNNER_STATE, { recursive: true });

const {
  invalidatePackageCache,
  scanWorkspacePackages
} = await import('../../server/target/packageScanner.js');

describe('scanWorkspacePackages cache', () => {
  it('短时内返回缓存副本', async () => {
    invalidatePackageCache();
    const first = await scanWorkspacePackages();
    const second = await scanWorkspacePackages();
    assert.equal(first.length, second.length);
    assert.notEqual(first, second);
    assert.deepEqual(
      first.map((p) => p.id),
      second.map((p) => p.id)
    );
  });

  it('invalidate 后强制刷新可看到新包', async () => {
    invalidatePackageCache();
    const before = await scanWorkspacePackages();
    const pkgB = path.join(packagesDir, 'b');
    mkdirSync(pkgB, { recursive: true });
    writeFileSync(
      path.join(pkgB, 'package.json'),
      JSON.stringify({ name: 'pkg-b' }),
      'utf8'
    );
    const cached = await scanWorkspacePackages();
    assert.equal(cached.length, before.length);

    invalidatePackageCache();
    const after = await scanWorkspacePackages(true);
    assert.ok(after.some((p) => p.name === 'pkg-b'));
    assert.ok(after.length > before.length);
  });
});
