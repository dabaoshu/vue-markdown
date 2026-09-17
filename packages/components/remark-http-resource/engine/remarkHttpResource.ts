import { visit } from 'unist-util-visit';
import { classifyHttpUrl } from '../core/classifyHttpUrl';
import type { HttpResource, HttpResourceOptions } from '../core/types';

/** 可打标的 mdast 节点 */
interface UrlNode {
  type: string;
  url?: string;
  data?: {
    httpResource?: HttpResource;
    hProperties?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

/**
 * 把分类结果写进节点 data（合并、不删其它键）。
 *
 * @param node link 或 image。
 * @param options 插件选项。
 */
export function annotateHttpResourceNode(
  node: UrlNode,
  options: HttpResourceOptions
): void {
  const url = typeof node.url === 'string' ? node.url : '';
  if (!url) return;
  const resource = classifyHttpUrl(url, options);
  if (!resource) return;

  const prev = node.data ?? {};
  const prevProps =
    prev.hProperties && typeof prev.hProperties === 'object'
      ? { ...prev.hProperties }
      : {};
  const hProperties: Record<string, unknown> = {
    ...prevProps,
    'data-http-kind': resource.kind
  };
  if (resource.ext == null) {
    delete hProperties['data-http-ext'];
  } else {
    hProperties['data-http-ext'] = resource.ext;
  }

  node.data = {
    ...prev,
    httpResource: resource,
    hProperties
  };
}

/**
 * remark 插件：给 http(s) 的 link / image 打资源分类标记。
 *
 * @param options 分类与可选裸 URL 提升。
 */
export function remarkHttpResource(options: HttpResourceOptions = {}) {
  return (tree: unknown) => {
    visit(tree as { type: string }, (node: UrlNode) => {
      if (node.type === 'link' || node.type === 'image') {
        annotateHttpResourceNode(node, options);
      }
    });
  };
}
