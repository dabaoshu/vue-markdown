import type { DemoTabId } from './demoData';
import { DEMO_MARKDOWN } from './demoData';

/** 按需加载的大体积示例缓存 */
const markdownCache = new Map<DemoTabId, string>();

/** 需要动态 import 大文件的 Tab */
const LAZY_DEMO_TABS = new Set<DemoTabId>(['diagrams', 'mermaid']);

/**
 * 异步加载演示 Tab 的 Markdown 内容（重模块 Tab 走 dynamic import）
 * @param id Tab 标识
 */
export async function loadDemoMarkdown(id: DemoTabId): Promise<string> {
  if (!LAZY_DEMO_TABS.has(id)) {
    return DEMO_MARKDOWN[id];
  }

  const cached = markdownCache.get(id);
  if (cached) {
    return cached;
  }

  let markdown = '';

  if (id === 'diagrams') {
    const { MERMAID_COMPLEX_SAMPLES_MARKDOWN } = await import('./mermaidFlowExamples');
    markdown = `# 复杂 Mermaid 样例

侧重大体量 \`flowchart\` / \`sequenceDiagram\` 等（官方 \`mermaid\` 引擎）。

块级 \`engine=beautiful\`、ASCII、meta 覆盖等请切换到 **Mermaid 插件** Tab。

${MERMAID_COMPLEX_SAMPLES_MARKDOWN}
`;
  } else if (id === 'mermaid') {
    const { MERMAID_README_DEMO_MARKDOWN } = await import('./mermaidReadmeExamples');
    markdown = MERMAID_README_DEMO_MARKDOWN;
  }

  markdownCache.set(id, markdown);
  return markdown;
}
