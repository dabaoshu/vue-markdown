export const enum ThinkEvent {
  thinkFlow = 'thinkFlow', // 进入 think 块的整体标记 最大的标记
  thinkFlowFence = 'thinkFlowFence', // 进入 think 块的围栏标记(开始和结束标签)
  thinkFlowFenceSequence = 'thinkFlowFenceSequence', // 进入围栏序列标记(标签内的 think 文本)
  thinkFlowValue = 'thinkFlowValue', // 进入 think 块的值标记(标签内的 think 文本)
  thinkFlowCloseFenceSequence = 'thinkFlowCloseFenceSequence',
  lineEnding = 'thinkLineEnding'
}

export type ThinkFlowOption = {
  tags: string[];
  customTags?: string[]; // 替换 customTagName，支持多标签
};
