import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const types = readFileSync(
  resolve(root, 'src/examples/workbench/types.ts'),
  'utf8'
);
const panel = readFileSync(
  resolve(root, 'src/examples/workbench/WorkbenchFeaturePanel.vue'),
  'utf8'
);
const component = readFileSync(
  resolve(root, 'src/examples/workbench/MarkdownWorkbench.vue'),
  'utf8'
);

for (const name of [
  'WorkbenchTab',
  'WorkbenchProps',
  'MarkdownWorkbenchExpose',
  'TabContentLoader'
]) {
  assert.match(types, new RegExp(`export (interface|type) ${name}\\b`));
}
for (const model of ['source', 'activeTab', 'features']) {
  assert.match(
    component,
    new RegExp(`defineModel.*${model}|${model}.*defineModel`, 's')
  );
}
for (const slot of ['toolbar-start', 'toolbar-end', 'preview-actions']) {
  assert.match(component, new RegExp(`name=["']${slot}["']`));
}
assert.match(component, /defineExpose/);
assert.match(component, /previewTarget/);
assert.match(component, /class="demo-workbench"/);
assert.match(component, /v-show="!sampleOpen"/);
assert.match(panel, /示例代码/);
assert.match(panel, /buildVueMarkdownSnippet/);
assert.doesNotMatch(component, /@\/|packages\/docs|packages\/simple/);

console.log('markdown workbench contract: ok');
