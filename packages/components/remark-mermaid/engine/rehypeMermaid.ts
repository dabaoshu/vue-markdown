import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';
import type { RehypeMermaidOptions } from '../core/types';

/**
 * 判断是否为 Mermaid 代码块
 * @param {Element} node 代码节点
 * @returns {boolean} 是否为 mermaid 块
 */
function isMermaidCodeNode(node: Element): boolean {
  if (node.tagName !== 'code') return false;
  const className = node.properties?.className;
  if (!Array.isArray(className)) return false;
  return className.includes('language-mermaid');
}

/**
 * 提取 code 节点内的纯文本内容
 * @param {Element} node code 节点
 * @returns {string} Mermaid DSL 内容
 */
function getNodeText(node: Element): string {
  return (node.children || [])
    .map((child: any) => (child.type === 'text' ? child.value : ''))
    .join('');
}

/**
 * 创建 rehype Mermaid 插件
 * @param {RehypeMermaidOptions} options 插件参数
 * @returns {(tree: Root) => void} rehype 转换函数
 */
export function rehypeMermaid(options: RehypeMermaidOptions = {}) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent: any) => {
      if (!parent || typeof index !== 'number') return;
      if (node.tagName !== 'pre') return;

      const codeNode = (node.children || []).find(
        (item: any) => item?.type === 'element' && item.tagName === 'code'
      ) as Element | undefined;

      if (!codeNode || !isMermaidCodeNode(codeNode)) return;

      const code = getNodeText(codeNode);
      parent.children[index] = {
        type: 'element',
        tagName: 'MermaidBlock',
        properties: {
          code,
          mermaidConfig: options.mermaidConfig,
          showLoading: options.showLoading,
          loadingText: options.loadingText,
          errorText: options.errorText
        },
        children: []
      };
    });
  };
}

