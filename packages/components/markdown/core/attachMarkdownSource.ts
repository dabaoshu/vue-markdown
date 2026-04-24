import type { VFile } from 'vfile';

/**
 * 将 markdown 原文挂载到语法树 `data.markdownSource`。
 * @returns 统一处理器插件
 */
export function attachMarkdownSource() {
  return (tree: any, file: VFile) => {
    if (!tree || typeof tree !== 'object') return;
    const root = tree as { data?: Record<string, unknown> };
    root.data = root.data || {};
    root.data.markdownSource = String(file.value || '');
  };
}
