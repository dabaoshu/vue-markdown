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
 * @param loading 是否仍在流式思考（未闭合）；默认 false。
 */
export function createThinkGroup(loading = false): ThinkGroupNode {
  return {
    type: 'thinkGroup',
    children: [],
    data: {
      hProperties: {
        loading,
        className: 'thinkGroupClass'
      },
      hName: 'thinkGroup',
      value: '',
      loading
    }
  };
}

/**
 * 判断 thinkFlow 是否仍处于 loading（以内容节点 meta.loading 为准）。
 * @param node thinkFlow 节点。
 */
export function isThinkFlowLoading(node: MarkdownLikeNode): boolean {
  const data = (
    node as MarkdownLikeNode & {
      meta?: { loading?: boolean };
      data?: { hChildren?: Array<{ meta?: { loading?: boolean } }> };
    }
  ).data;
  const contentMeta = data?.hChildren?.[0]?.meta;
  if (typeof contentMeta?.loading === 'boolean') {
    return contentMeta.loading;
  }
  const flowMeta = (node as { meta?: { loading?: boolean } }).meta;
  return Boolean(flowMeta?.loading);
}

/**
 * 将 thinkGroup 的 loading 状态写回 data / hProperties。
 * @param thinkGroup 目标节点。
 * @param loading 是否 loading。
 */
export function setThinkGroupLoading(
  thinkGroup: ThinkGroupNode,
  loading: boolean
): void {
  if (!thinkGroup.data) {
    thinkGroup.data = { hName: 'thinkGroup' };
  }
  thinkGroup.data.loading = loading;
  if (!thinkGroup.data.hProperties) {
    thinkGroup.data.hProperties = { className: 'thinkGroupClass' };
  }
  thinkGroup.data.hProperties.loading = loading;
}
