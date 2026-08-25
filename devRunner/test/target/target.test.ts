import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'dev-runner-'));
const packagesDir = path.join(fixtureRoot, 'packages');
const simpleDir = path.join(packagesDir, 'simple');
const stateDir = path.join(fixtureRoot, '.state');

mkdirSync(simpleDir, { recursive: true });
mkdirSync(stateDir, { recursive: true });
writeFileSync(
  path.join(fixtureRoot, 'package.json'),
  JSON.stringify({ name: 'fixture-root', scripts: { dev: 'echo root' } }),
  'utf8'
);
writeFileSync(
  path.join(simpleDir, 'package.json'),
  JSON.stringify({ name: '@nnnb/simple', scripts: { dev: 'echo simple' } }),
  'utf8'
);

process.env.DEV_RUNNER_ROOT = fixtureRoot;
process.env.DEV_RUNNER_PACKAGES = packagesDir;
process.env.DEV_RUNNER_STATE = stateDir;

const { buildTargetFromPath } = await import(
  '../../server/target/packageScanner.js'
);
const { resolveTargetInput } = await import(
  '../../server/target/targetResolver.js'
);

describe('resolveTargetInput', () => {
  it('解析 . 为仓库根', async () => {
    const target = await resolveTargetInput('.');
    assert.equal(target.relativePath, '.');
    assert.equal(target.source, 'workspace');
    assert.equal(target.name, 'fixture-root');
  });

  it('解析 packages 短名', async () => {
    const target = await resolveTargetInput('simple');
    assert.equal(target.relativePath, 'packages/simple');
    assert.equal(target.name, '@nnnb/simple');
  });

  it('解析 packages/xxx', async () => {
    const target = await resolveTargetInput('packages/simple');
    assert.equal(target.absolutePath, path.resolve(simpleDir));
  });

  it('空输入抛 400', async () => {
    await assert.rejects(
      () => resolveTargetInput('   '),
      (err: Error & { statusCode?: number }) => err.statusCode === 400
    );
  });

  it('不存在的目标抛 404', async () => {
    await assert.rejects(
      () => resolveTargetInput('no-such-pkg'),
      (err: Error & { statusCode?: number }) => err.statusCode === 404
    );
  });
});

describe('buildTargetFromPath', () => {
  it('读取 package.json scripts', async () => {
    const target = await buildTargetFromPath(simpleDir, 'workspace');
    assert.deepEqual(target.scriptNames, ['dev']);
    assert.equal(target.source, 'workspace');
  });
});
