import type { AstUiExpectation } from '../_shared/astUiTypes';

/** CodeHighLight 用例分组 */
export type CodeHighlightCaseGroup = 'fence' | 'lang' | 'inline' | 'edge';

/**
 * 对解析后 mdast 的断言描述。
 */
export interface CodeHighlightExpectation {
  noThrow?: boolean;
  rootChildTypes?: string[];
  /** code 节点数量 */
  codeCount?: number;
  /** 第一个 code 的 lang */
  firstCodeLang?: string | null;
  /** code.value 应包含 */
  codeValueIncludes?: string[];
  contentIncludes?: string[];
  contentExcludes?: string[];
  /** 不应出现围栏 code 节点 */
  noCodeFence?: boolean;
  ui?: AstUiExpectation;
}

/**
 * 单条代码高亮测试用例。
 */
export interface CodeHighlightTestCase {
  id: string;
  title: string;
  group: CodeHighlightCaseGroup;
  description: string;
  markdown: string;
  /** 是否挂载 CodeBlock 组件，默认 true */
  highlight?: boolean;
  expect: CodeHighlightExpectation;
}
