import type { MarkdownFeatures } from '../../index';
import { WORKBENCH_FEATURE_TOGGLES } from './featureToggles';

/**
 * 把布尔特性对象格式化为多行字面量，便于贴进文档样例。
 * @param features 当前工作台开关
 */
function formatFeaturesLiteral(features: MarkdownFeatures): string {
  const lines = WORKBENCH_FEATURE_TOGGLES.map(({ key }) => `  ${key}: ${features[key]},`);
  return `{\n${lines.join('\n')}\n}`;
}

/**
 * 当前已开启特性的中文标签列表。
 * @param features 当前工作台开关
 */
export function listEnabledFeatureLabels(features: MarkdownFeatures): string[] {
  return WORKBENCH_FEATURE_TOGGLES.filter(({ key }) => features[key]).map(
    ({ label }) => label
  );
}

/**
 * 当前已开启特性的中文标签，用于样例标题。
 * @param features 当前工作台开关
 */
export function describeEnabledFeatures(features: MarkdownFeatures): string {
  const labels = listEnabledFeatureLabels(features);
  return labels.length ? labels.join(' · ') : '无额外插件';
}

/**
 * 生成 MarkdownRenderer 封装用法（与 Demo 工作台相同入口）。
 * @param features 当前工作台开关
 */
export function buildRendererSnippet(features: MarkdownFeatures): string {
  return `<script setup lang="ts">
import { MarkdownRenderer, type MarkdownFeatures } from '@nnnb/markdown-ui';

/** 与当前 Demo 特性开关一致 */
const features: MarkdownFeatures = ${formatFeaturesLiteral(features)};

const markdown = \`# Hello @nnnb/markdown\`;
</script>

<template>
  <MarkdownRenderer :source="markdown" :features="features" />
</template>
`;
}

/**
 * 生成与当前开关等价的 VueMarkdown 按需接入样例。
 * @param features 当前工作台开关
 */
export function buildVueMarkdownSnippet(features: MarkdownFeatures): string {
  const imports = [`import { VueMarkdown } from '@nnnb/markdown/vue-ui';`];
  const engineImports: string[] = [];
  const uiImports: string[] = [];
  const extraImports: string[] = [];
  const remarkParts: string[] = [];
  const rehypeParts: string[] = [];
  const componentLines: string[] = [];
  const customTags: string[] = [];
  const setupLines: string[] = [];

  if (features.think) {
    engineImports.push('MergeThinkRemark');
    uiImports.push('ThinkElement', 'thinkGroupElementt');
    remarkParts.push('MergeThinkRemark');
    componentLines.push('  think: ThinkElement,', '  thinkGroup: thinkGroupElementt,');
    customTags.push("'think'");
  }
  if (features.breaks) {
    extraImports.push(`import RemarkBreaks from 'remark-breaks';`);
    remarkParts.push('RemarkBreaks');
  }
  if (features.gfm) {
    extraImports.push(`import RemarkGfm from 'remark-gfm';`);
    remarkParts.push('[RemarkGfm, { singleTilde: false }]');
  }
  if (features.math) {
    extraImports.push(`import 'katex/dist/katex.min.css';`);
    setupLines.push(`const math = { strict: false, remarkOptions: {}, rehypeOptions: {} };`);
  }
  if (features.mermaid) {
    engineImports.push('rehypeMermaid');
    uiImports.push('MermaidInteractiveBlock');
    rehypeParts.push(`[rehypeMermaid, {
    engine: 'mermaid',
    enableMetaOptions: true,
    fallbackMode: 'keep-code'
  }]`);
    componentLines.push('  MermaidBlock: MermaidInteractiveBlock,');
  }
  if (features.codeHighlight) {
    uiImports.push('CodeBlock');
    componentLines.push('  code: CodeBlock,');
  }
  if (features.customTags) {
    customTags.push("'custom'", "'other'");
  }
  if (features.elTable) {
    engineImports.push('tableNodeParse');
    extraImports.push(`import { ElTable, ElTableColumn } from 'element-plus';`);
    extraImports.push(`import { h } from 'vue';`);
    componentLines.push(`  table: (props: { node: unknown }) => {
    const { columns, data } = tableNodeParse(props.node as never, {
      type: 'object',
      uuid: true
    });
    return h(ElTable, { data }, () =>
      columns.map((col) => h(ElTableColumn, { key: col, prop: col, label: col }))
    );
  },`);
  }

  if (engineImports.length) {
    imports.push(
      `import { ${[...new Set(engineImports)].join(', ')} } from '@nnnb/markdown';`
    );
  }
  if (uiImports.length) {
    imports.push(
      `import { ${[...new Set(uiImports)].join(', ')} } from '@nnnb/markdown-ui';`
    );
  }
  imports.push(...extraImports);

  const remarkBlock = remarkParts.length
    ? `const remarkPlugins = [\n  ${remarkParts.join(',\n  ')}\n];`
    : 'const remarkPlugins = [];';
  const rehypeBlock = rehypeParts.length
    ? `const rehypePlugins = [\n  ${rehypeParts.join(',\n  ')}\n];`
    : 'const rehypePlugins = [];';
  const componentsBlock = componentLines.length
    ? `const components = {\n${componentLines.join('\n')}\n};`
    : 'const components = {};';
  const customBlock = customTags.length
    ? `const customElements = [${customTags.join(', ')}];`
    : '';
  const mathAttr = features.math ? '\n    :math="math"' : '';
  const customAttr = customTags.length ? '\n    :custom-elements="customElements"' : '';

  return `<script setup lang="ts">
${imports.join('\n')}

${[remarkBlock, rehypeBlock, componentsBlock, customBlock, ...setupLines]
    .filter(Boolean)
    .join('\n\n')}

const markdown = \`# Hello @nnnb/markdown\`;
</script>

<template>
  <VueMarkdown
    class="markdown"
    :source="markdown"
    :remark-plugins="remarkPlugins"
    :rehype-plugins="rehypePlugins"
    :components="components"${customAttr}${mathAttr}
  />
</template>
`;
}
