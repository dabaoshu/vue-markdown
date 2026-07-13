import type { AstUiExpectation } from '../_shared/astUiTypes';

/** remark-math 用例分组 */
export type RemarkMathCaseGroup = 'inline' | 'block' | 'mixed' | 'edge';

/**
 * 对解析后 mdast 的断言描述。
 */
export interface RemarkMathExpectation {
  /** 解析不得抛错（默认 true） */
  noThrow?: boolean;
  /** root 直接子节点 type 序列 */
  rootChildTypes?: string[];
  /** inlineMath 数量 */
  inlineMathCount?: number;
  /** 块级 math 数量 */
  mathCount?: number;
  /** 某节点 value 应包含（任意 math / inlineMath） */
  mathValueIncludes?: string[];
  /** 全文文本包含 */
  contentIncludes?: string[];
  /** 全文文本不包含 */
  contentExcludes?: string[];
  /** 不应出现任何数学节点 */
  noMathNodes?: boolean;
  /** UI 断言 */
  ui?: AstUiExpectation;
}

/**
 * 单条 remark-math 测试用例。
 */
export interface RemarkMathTestCase {
  id: string;
  title: string;
  group: RemarkMathCaseGroup;
  description: string;
  markdown: string;
  /** 是否启用 math，默认 true；false 用于负向 */
  mathEnabled?: boolean;
  expect: RemarkMathExpectation;
}
