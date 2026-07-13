import { SKIP, visitParents } from 'unist-util-visit-parents';
import type { Element, Root } from 'hast';

/**
 * rehype 插件占位：预留 thinkGroup 在 hast 层的后处理扩展点。
 * @param _options 插件配置（暂未使用）
 */
export function MergeThinkRehype(_options?: unknown) {
  return function (tree: Root) {
    visitParents(tree, 'element', function (_element: Element) {
      return SKIP;
    });
  };
}
