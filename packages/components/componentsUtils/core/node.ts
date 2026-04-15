import type { MarkdownLikeNode } from './types';

/**
 * 判断节点是否为指定标签的 element 节点。
 *
 * @param node 待判断节点
 * @param tagName 标签名
 * @returns 是否匹配
 */
export function isTagElement(node: MarkdownLikeNode | undefined, tagName: string): boolean {
  return node?.type === 'element' && node.tagName === tagName;
}

/**
 * 递归提取节点下的文本内容。
 *
 * @param node 节点
 * @returns 文本内容
 */
export function getNodeText(node?: MarkdownLikeNode): string {
  if (!node) {
    return '';
  }

  if (typeof node.value === 'string') {
    return node.value;
  }

  if (!node.children?.length) {
    return '';
  }

  return node.children.map((child) => getNodeText(child)).join('');
}

/**
 * 获取指定标签的直接子节点列表。
 *
 * @param node 父节点
 * @param tagName 标签名
 * @returns 匹配到的子节点列表
 */
export function getTagChilds(node: MarkdownLikeNode | undefined, tagName: string): MarkdownLikeNode[] {
  if (node?.type !== 'element' || !node.children?.length) {
    return [];
  }
  return node.children.filter((child) => isTagElement(child, tagName));
}
