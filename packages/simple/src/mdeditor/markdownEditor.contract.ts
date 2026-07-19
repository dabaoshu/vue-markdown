import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(import.meta.dirname, 'MarkdownEditor.vue'),
  'utf8'
);
assert.match(source, /@nnnb\/markdown-ui\/examples/);
assert.match(source, /previewTarget/);
assert.doesNotMatch(source, /previewTarget\.value/);
assert.match(source, /@nnnb\/markdown-ui\/style\.css/);
assert.match(source, /toolbar-end|preview-actions/);
assert.doesNotMatch(source, /querySelector\([^)]*preview-content/);
assert.doesNotMatch(source, /\.\.\/components\/markdown/);
console.log('simple markdown editor integration contract: ok');
