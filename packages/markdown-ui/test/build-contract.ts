import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const stylePath = resolve(root, 'dist/style.css');

assert.ok(existsSync(stylePath), 'the public stylesheet must be emitted');
const style = readFileSync(stylePath, 'utf8');
for (const selector of [
  '.demo-workbench',
  '.cm-editor',
  '.markdown-think',
  '.markdown'
]) {
  assert.match(style, new RegExp(selector.replace('.', '\\.')));
}
assert.ok(existsSync(resolve(root, 'dist/es/index.mjs')));
assert.ok(existsSync(resolve(root, 'dist/es/examples.mjs')));
assert.doesNotMatch(
  readFileSync(resolve(root, 'dist/es/index.mjs'), 'utf8'),
  /\brequire\(/
);

console.log('markdown-ui build contract: ok');
