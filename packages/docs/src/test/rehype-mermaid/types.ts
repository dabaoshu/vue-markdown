import type { AstUiExpectation } from '../_shared/astUiTypes';

/** rehypeMermaid 用例分组 */
export type RehypeMermaidCaseGroup = 'flowchart' | 'meta' | 'edge';

/**
 * 对解析后 mdast 的断言描述。
 */
export interface RehypeMermaidExpectation {
  noThrow?: boolean;
  rootChildTypes?: string[];
  /** lang=mermaid 的 code 数量 */
  mermaidCodeCount?: number;
  /** 任意 code 数量 */
  codeCount?: number;
  /** 第一个 mermaid code 的 value 片段 */
  codeValueIncludes?: string[];
  /** fence meta 字符串应包含（若有） */
  metaIncludes?: string[];
  contentIncludes?: string[];
  contentExcludes?: string[];
  /** 不应出现 mermaid fence */
  noMermaidFence?: boolean;
  ui?: AstUiExpectation;
}

/**
 * 单条 rehypeMermaid 测试用例。
 */
export interface RehypeMermaidTestCase {
  id: string;
  title: string;
  group: RehypeMermaidCaseGroup;
  description: string;
  markdown: string;
  /** 是否启用 rehypeMermaid + MermaidBlock，默认 true */
  mermaidEnabled?: boolean;
  expect: RehypeMermaidExpectation;
}
