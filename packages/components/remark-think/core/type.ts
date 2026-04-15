/**
 * think 语法解析过程中的事件类型。
 */
export const enum ThinkEvent {
  thinkFlow = 'thinkFlow',
  thinkFlowFence = 'thinkFlowFence',
  thinkFlowFenceSequence = 'thinkFlowFenceSequence',
  thinkFlowValue = 'thinkFlowValue',
  thinkFlowCloseFenceSequence = 'thinkFlowCloseFenceSequence',
  lineEnding = 'thinkLineEnding'
}

/**
 * remark-think 插件配置。
 */
export type ThinkFlowOption = {
  tags: string[];
  customTags?: string[];
};
