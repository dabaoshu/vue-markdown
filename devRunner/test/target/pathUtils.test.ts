import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import path from 'node:path';
import { displayPath, normalizePathId } from '../../server/target/pathUtils.js';

describe('pathUtils', () => {
  it('normalizePathId 统一斜杠', () => {
    const id = normalizePathId(path.join('C:', 'tmp', 'proj'));
    assert.ok(!id.includes('\\'));
    assert.ok(id.includes('/'));
  });

  it('displayPath 仓库根为 .', () => {
    const root = path.resolve('/repo');
    assert.equal(displayPath(root, root), '.');
  });

  it('displayPath 仓库内用相对路径', () => {
    const root = path.resolve('/repo');
    const pkg = path.join(root, 'packages', 'simple');
    assert.equal(displayPath(pkg, root), 'packages/simple');
  });

  it('displayPath 仓库外用绝对路径风格', () => {
    const root = path.resolve('/repo');
    const outside = path.resolve('/other/app');
    const shown = displayPath(outside, root);
    assert.ok(shown.includes('other'));
    assert.ok(!shown.startsWith('packages/'));
  });
});
