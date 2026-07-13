import type { MarkdownLikeNode } from './types';

/**
 * thinkGroup 节点的 hast/mdast 扩展数据。
 */
export interface ThinkGroupNodeData {
  hProperties?: Record<string, unknown>;
  hName?: string;
  value?: string;
  loading?: boolean;
}

/**
 * 合并后的 thinkGroup 节点结构。
 */
export interface ThinkGroupNode extends MarkdownLikeNode {
  type: 'thinkGroup';
  data?: ThinkGroupNodeData;
}

/**
 * 创建空的 thinkGroup 容器节点。
 */
export function createThinkGroup(): ThinkGroupNode {
  return {
    type: 'thinkGroup',
    children: [],
    data: {
      hProperties: {
        loading: false,
        className: 'thinkGroupClass'
      },
      hName: 'thinkGroup',
      value: '',
      loading: true
    }
  };
}
