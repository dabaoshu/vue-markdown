import assert from 'node:assert/strict';
import {
  buildRendererSnippet,
  buildVueMarkdownSnippet,
  describeEnabledFeatures,
  listEnabledFeatureLabels
} from '../src/examples/workbench/usageSnippet';
import type { MarkdownFeatures } from '../src/index';

const allOff: MarkdownFeatures = {
  gfm: false,
  breaks: false,
  math: false,
  mermaid: false,
  think: false,
  customTags: false,
  codeHighlight: false,
  elTable: false
};

const gfmOnly: MarkdownFeatures = { ...allOff, gfm: true, breaks: true };

assert.match(buildRendererSnippet(gfmOnly), /MarkdownRenderer/);
assert.match(buildRendererSnippet(gfmOnly), /gfm: true/);
assert.match(buildVueMarkdownSnippet(gfmOnly), /remark-gfm/);
assert.match(buildVueMarkdownSnippet(gfmOnly), /remark-breaks/);
assert.doesNotMatch(buildVueMarkdownSnippet(gfmOnly), /rehypeMermaid/);
assert.doesNotMatch(buildVueMarkdownSnippet(gfmOnly), /katex/);
assert.deepEqual(listEnabledFeatureLabels(gfmOnly), ['GFM', '换行保留']);
assert.equal(describeEnabledFeatures(gfmOnly), 'GFM · 换行保留');

const mermaidOn: MarkdownFeatures = { ...allOff, mermaid: true };
assert.match(buildVueMarkdownSnippet(mermaidOn), /rehypeMermaid/);
assert.match(buildVueMarkdownSnippet(mermaidOn), /MermaidInteractiveBlock/);

console.log('usage snippet contract: ok');
