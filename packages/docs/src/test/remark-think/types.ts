/**
 * remark-think 测试用例类型定义。
 */

/** 用例分组（便于按能力筛选） */
export type RemarkThinkCaseGroup =
  | 'block'
  | 'inline'
  | 'merge'
  | 'multi-tag'
  | 'mixed'
  | 'edge';

/**
 * 渲染 DOM 选择器期望。
 */
export interface RemarkThinkUiSelectorExpect {
  /** CSS 选择器 */
  selector: string;
  /** 精确匹配数量 */
  count?: number;
  /** 至少数量 */
  min?: number;
}

/**
 * 对页面实时预览 DOM 的断言（即使解析不抛错，UI 不符合也会失败）。
 */
export interface RemarkThinkUiExpectation {
  /** 必须存在的选择器 */
  has?: Array<string | RemarkThinkUiSelectorExpect>;
  /** 必须不存在的选择器 */
  missing?: string[];
  /** 预览可见文本应包含 */
  textIncludes?: string[];
  /** 预览可见文本不应包含 */
  textExcludes?: string[];
  /**
   * 预览中不应再露出原始开闭标签文本（如 `<think>` / `</think>`）。
   * 正向解析成功用例默认建议开启。
   */
  noRawTags?: boolean;
}

/**
 * 对解析后 mdast 的断言描述。
 * 字段均为可选；未声明的字段不做检查。
 */
export interface RemarkThinkExpectation {
  /** 解析过程不得抛错（默认 true） */
  noThrow?: boolean;
  /** root 直接子节点 type 序列 */
  rootChildTypes?: string[];
  /** root 下 thinkFlow 节点数量（未合并前，或未启用 Merge 时） */
  thinkFlowCount?: number;
  /** root 下 thinkGroup 节点数量（启用 MergeThinkRemark 时） */
  thinkGroupCount?: number;
  /** 某个 thinkGroup 的 children 数量（仅检查第一个 thinkGroup） */
  firstThinkGroupSize?: number;
  /** 段落内是否存在 tagName 对应的行内 element */
  inlineTagName?: string;
  /** 全文序列化后应包含的文本片段 */
  contentIncludes?: string[];
  /** 全文序列化后不应包含的文本片段 */
  contentExcludes?: string[];
  /** 不应出现 thinkFlow / thinkGroup（负向用例） */
  noThinkNodes?: boolean;
  /**
   * 渲染 UI 断言。
   * 未显式提供时，页面会根据 mdast 期望自动推导一份默认 UI 期望。
   */
  ui?: RemarkThinkUiExpectation;
}

/**
 * 单条 remark-think 测试用例。
 */
export interface RemarkThinkTestCase {
  /** 稳定 ID，如 block-classic */
  id: string;
  /** 人类可读标题 */
  title: string;
  /** 分组 */
  group: RemarkThinkCaseGroup;
  /** 用例说明（边界意图） */
  description: string;
  /** 输入 Markdown */
  markdown: string;
  /** remarkThink tags 配置，默认 ['think'] */
  tags?: string[];
  /** 是否启用 MergeThinkRemark，默认 false */
  merge?: boolean;
  /** 期望断言 */
  expect: RemarkThinkExpectation;
}
