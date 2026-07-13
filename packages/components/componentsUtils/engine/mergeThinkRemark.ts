import { createThinkGroup } from '../core/thinkGroup';
import type { MarkdownLikeNode } from '../core/types';

/**
 * remark 插件：将 root 下连续的 thinkFlow 块合并为单个 thinkGroup 节点。
 * 仅扫描 root 直接子节点，避免对已合并节点重复 visit 导致 AST 破坏。
 */
export function MergeThinkRemark() {
  return (tree: MarkdownLikeNode) => {
    const root = tree;
    if (!root.children?.length) {
      return;
    }

    const merged: MarkdownLikeNode[] = [];
    let index = 0;

    while (index < root.children.length) {
      const node = root.children[index];

      if (node.type === 'thinkFlow') {
        const thinkGroup = createThinkGroup();

        while (
          index < root.children.length &&
          root.children[index].type === 'thinkFlow'
        ) {
          thinkGroup.children!.push(root.children[index]);
          index += 1;
        }

        merged.push(thinkGroup);
        continue;
      }

      merged.push(node);
      index += 1;
    }

    root.children = merged;
  };
}
