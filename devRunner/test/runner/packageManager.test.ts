import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import {
  detectPackageManager,
  resolveRunCommand
} from '../../server/runner/packageManager.js';

const prevPm = process.env.DEV_RUNNER_PM;

afterEach(() => {
  if (prevPm === undefined) {
    delete process.env.DEV_RUNNER_PM;
  } else {
    process.env.DEV_RUNNER_PM = prevPm;
  }
});

describe('detectPackageManager', () => {
  it('DEV_RUNNER_PM 强制指定优先', () => {
    process.env.DEV_RUNNER_PM = 'yarn';
    const root = mkdtempSync(path.join(tmpdir(), 'pm-force-'));
    writeFileSync(path.join(root, 'pnpm-lock.yaml'), '', 'utf8');
    assert.equal(detectPackageManager(root), 'yarn');
  });

  it('auto 时读 packageManager 字段', () => {
    delete process.env.DEV_RUNNER_PM;
    const root = mkdtempSync(path.join(tmpdir(), 'pm-field-'));
    writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'x', packageManager: 'pnpm@9.0.0' }),
      'utf8'
    );
    assert.equal(detectPackageManager(root, { mode: 'auto' }), 'pnpm');
  });

  it('auto 时按 lockfile 判断', () => {
    delete process.env.DEV_RUNNER_PM;
    const root = mkdtempSync(path.join(tmpdir(), 'pm-lock-'));
    writeFileSync(path.join(root, 'package.json'), '{}', 'utf8');
    writeFileSync(path.join(root, 'pnpm-lock.yaml'), '', 'utf8');
    assert.equal(detectPackageManager(root, { mode: 'auto' }), 'pnpm');
  });

  it('子目录向上查找 lockfile', () => {
    delete process.env.DEV_RUNNER_PM;
    const root = mkdtempSync(path.join(tmpdir(), 'pm-up-'));
    const child = path.join(root, 'packages', 'a');
    mkdirSync(child, { recursive: true });
    writeFileSync(path.join(root, 'yarn.lock'), '', 'utf8');
    writeFileSync(path.join(child, 'package.json'), '{}', 'utf8');
    assert.equal(detectPackageManager(child, { mode: 'auto' }), 'yarn');
  });

  it('无线索时默认 npm', () => {
    delete process.env.DEV_RUNNER_PM;
    const root = mkdtempSync(path.join(tmpdir(), 'pm-default-'));
    writeFileSync(path.join(root, 'package.json'), '{}', 'utf8');
    assert.equal(detectPackageManager(root, { mode: 'auto' }), 'npm');
  });
});

describe('resolveRunCommand', () => {
  it('生成对应包管理器的 run 命令', () => {
    assert.equal(resolveRunCommand('pnpm', 'dev'), 'pnpm run dev');
    assert.equal(resolveRunCommand('yarn', 'build'), 'yarn run build');
    assert.equal(resolveRunCommand('npm', 'test'), 'npm run test');
  });
});
