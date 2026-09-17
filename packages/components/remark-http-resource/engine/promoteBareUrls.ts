import { SKIP, visit } from 'unist-util-visit';

const BARE_URL = /https?:\/\/[^\s<>"'()]+/gi;
const TRAILING_PUNCT = /[.,;:!?。，；：！？]+$/;
const SKIP_PARENT = new Set(['link', 'image', 'code', 'inlineCode', 'definition']);

interface TextNode {
  type: 'text';
  value: string;
}

interface LinkNode {
  type: 'link';
  url: string;
  title: null;
  children: TextNode[];
}

interface ParentNode {
  type: string;
  children: Array<TextNode | LinkNode | { type: string }>;
}

/**
 * 把一段文本拆成 text / link 节点。
 *
 * @param value 原始文本。
 * @returns 拆分后的节点数组；无 URL 时返回原样文本节点。
 */
export function splitTextWithBareHttpUrls(value: string): Array<TextNode | LinkNode> {
  const nodes: Array<TextNode | LinkNode> = [];
  let lastIndex = 0;
  BARE_URL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BARE_URL.exec(value))) {
    const raw = match[0];
    const url = raw.replace(TRAILING_PUNCT, '');
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    }
    if (url) {
      nodes.push({
        type: 'link',
        url,
        title: null,
        children: [{ type: 'text', value: url }]
      });
    }
    lastIndex = match.index + url.length;
    BARE_URL.lastIndex = lastIndex;
  }
  if (lastIndex < value.length) {
    nodes.push({ type: 'text', value: value.slice(lastIndex) });
  }
  return nodes.length ? nodes : [{ type: 'text', value }];
}

/**
 * 将树中普通 text 的 http(s) 绝对地址提升为 link。
 *
 * @param tree mdast 根。
 */
export function promoteBareHttpUrls(tree: unknown): void {
  visit(
    tree as { type: string },
    'text',
    (node: TextNode, index: number | null, parent: ParentNode | undefined) => {
      if (parent == null || index == null) return;
      if (SKIP_PARENT.has(parent.type)) return;
      if (!node.value || !/https?:\/\//i.test(node.value)) return;

      const next = splitTextWithBareHttpUrls(node.value);
      if (next.length === 1 && next[0].type === 'text') return;

      parent.children.splice(index, 1, ...next);
      return [SKIP, index + next.length];
    }
  );
}
