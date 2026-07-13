import type { AstUiExpectation } from '../_shared/astUiTypes';

/** remark-gfm / remark-breaks 用例分组 */
export type RemarkGfmCaseGroup =
  | 'table'
  | 'task'
  | 'strike'
  | 'link'
  | 'breaks'
  | 'edge';

/**
 * 对解析后 mdast 的断言描述。
 */
export interface RemarkGfmExpectation {
  /** 解析过程不得抛错（默认 true） */
  noThrow?: boolean;
  /** root 直接子节点 type 序列 */
  rootChildTypes?: string[];
  /** table 节点数量 */
  tableCount?: number;
  /** delete 节点数量 */
  deleteCount?: number;
  /** break 节点数量（remark-breaks） */
  breakCount?: number;
  /** checked === true 的 listItem 数量 */
  checkedTrueCount?: number;
  /** checked === false 的 listItem 数量 */
  checkedFalseCount?: number;
  /** link 节点数量 */
  linkCount?: number;
  /** 全文应包含 */
  contentIncludes?: string[];
  /** 全文不应包含 */
  contentExcludes?: string[];
  /** 不应出现 table */
  noTable?: boolean;
  /** 不应出现 delete */
  noDelete?: boolean;
  /** UI 断言；未提供时由默认推导 */
  ui?: AstUiExpectation;
}

/**
 * 单条 remark-gfm 测试用例。
 */
export interface RemarkGfmTestCase {
  /** 稳定 ID */
  id: string;
  /** 标题 */
  title: string;
  /** 分组 */
  group: RemarkGfmCaseGroup;
  /** 边界意图说明 */
  description: string;
  /** 输入 Markdown */
  markdown: string;
  /** 是否启用 remark-gfm，默认 true */
  gfm?: boolean;
  /** 是否启用 remark-breaks，默认 false */
  breaks?: boolean;
  /** 期望断言 */
  expect: RemarkGfmExpectation;
}
