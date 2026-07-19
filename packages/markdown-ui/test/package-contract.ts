import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const markdownPkg = JSON.parse(
  readFileSync(resolve(root, '../components/package.json'), 'utf8')
);
const stableEntry = readFileSync(resolve(root, 'src/index.ts'), 'utf8');

assert.equal(pkg.name, '@nnnb/markdown-ui');
assert.ok(pkg.exports['.'], 'stable root export is required');
assert.ok(pkg.exports['./examples'], 'examples export is required');
assert.deepEqual(Object.keys(pkg.exports).sort(), ['.', './examples']);
assert.equal(pkg.exports['.'].import, './dist/es/index.mjs');
assert.equal(pkg.exports['.'].require, './dist/lib/index.js');
assert.equal(pkg.exports['./examples'].import, './dist/es/examples.mjs');
assert.equal(pkg.exports['./examples'].require, './dist/lib/examples.js');
assert.equal(pkg.dependencies['@nnnb/markdown'], 'workspace:^');
assert.ok(markdownPkg.exports['.'], '@nnnb/markdown root export is required');
assert.ok(
  markdownPkg.exports['./vue-ui'],
  '@nnnb/markdown vue-ui export is required'
);

for (const exportName of [
  'CodeBlock',
  'MermaidPreviewPane',
  'MermaidInteractiveBlock',
  'MermaidCardBlock',
  'MermaidCanvasViewport',
  'MarkdownRenderer',
  'MarkdownCodeMirror',
  'EditorHelper',
  'createToolbarItems',
  'createShortcuts',
  'ThinkElement',
  'MarkdownFeatures',
  'MarkdownRendererProps'
]) {
  assert.match(
    stableEntry,
    new RegExp(`\\b${exportName}\\b`),
    `stable entry must export ${exportName}`
  );
}

console.log('markdown-ui package contract: ok');
