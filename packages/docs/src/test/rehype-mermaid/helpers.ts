import { unified } from 'unified';
import remarkParse from 'remark-parse';
import type { AstUiCaseResult } from '../_shared/astUiTypes';
import {
  arraysEqual,
  collectNodesByType,
  treeText,
  treeToDisplayJson,
  type TestTreeNode
} from '../_shared/astUiHelpers';
import type {
  RehypeMermaidExpectation,
  RehypeMermaidTestCase
} from './types';

export type { TestTreeNode };
export { treeToDisplayJson };

/**
 * 解析 Markdown，得到含 mermaid fence 的 mdast。
 *
 * @param markdown 输入。
 */
export function parseMermaidMarkdown(markdown: string): TestTreeNode {
  const processor = unified().use(remarkParse);
  const tree = processor.parse(markdown) as TestTreeNode;
  return processor.runSync(tree) as TestTreeNode;
}

/**
 * 收集 lang=mermaid 的 code 节点。
 *
 * @param root 根节点。
 */
function collectMermaidCodes(root: TestTreeNode): TestTreeNode[] {
  return collectNodesByType(root, 'code').filter(
    (n) => (n.lang || '').toLowerCase() === 'mermaid'
  );
}

/**
 * AST 断言。
 *
 * @param testCase 用例。
 * @param tree 解析树。
 * @param thrown 异常。
 */
export function assertRehypeMermaidCase(
  testCase: RehypeMermaidTestCase,
  tree: TestTreeNode | null,
  thrown?: unknown
): void {
  const expectation = testCase.expect;
  const noThrow = expectation.noThrow !== false;

  if (thrown) {
    if (noThrow) {
      fail(testCase, `期望不抛错，实际抛出: ${stringifyError(thrown)}`);
    }
    return;
  }
  if (!tree) fail(testCase, '解析结果为空');

  const root = tree!;
  const rootTypes = (root.children ?? []).map((c) => c.type ?? '');
  const text = treeText(root);
  const codes = collectNodesByType(root, 'code');
  const mermaidCodes = collectMermaidCodes(root);

  assertOptional(
    testCase,
    'rootChildTypes',
    expectation.rootChildTypes,
    rootTypes,
    arraysEqual
  );
  assertOptional(
    testCase,
    'codeCount',
    expectation.codeCount,
    codes.length,
    (a, b) => a === b
  );
  assertOptional(
    testCase,
    'mermaidCodeCount',
    expectation.mermaidCodeCount,
    mermaidCodes.length,
    (a, b) => a === b
  );

  if (expectation.noMermaidFence && mermaidCodes.length > 0) {
    fail(testCase, `期望无 mermaid fence，实际 ${mermaidCodes.length}`);
  }

  const codeValues = mermaidCodes
    .concat(codes)
    .map((c) => c.value ?? '')
    .join('\n');
  for (const snippet of expectation.codeValueIncludes ?? []) {
    if (!codeValues.includes(snippet)) {
      fail(testCase, `codeValueIncludes 未命中: ${JSON.stringify(snippet)}`);
    }
  }

  for (const snippet of expectation.metaIncludes ?? []) {
    const metas = mermaidCodes.map((c) => String(c.meta ?? '')).join(' ');
    if (!metas.includes(snippet)) {
      fail(
        testCase,
        `metaIncludes 未命中: ${JSON.stringify(snippet)}；实际 meta=${JSON.stringify(metas)}`
      );
    }
  }

  for (const snippet of expectation.contentIncludes ?? []) {
    if (!text.includes(snippet) && !codeValues.includes(snippet)) {
      fail(testCase, `contentIncludes 未命中: ${JSON.stringify(snippet)}`);
    }
  }
  for (const snippet of expectation.contentExcludes ?? []) {
    if (text.includes(snippet) || codeValues.includes(snippet)) {
      fail(
        testCase,
        `contentExcludes 命中了不应出现的: ${JSON.stringify(snippet)}`
      );
    }
  }
}

/**
 * 运行单条用例。
 *
 * @param testCase 用例。
 */
export function runRehypeMermaidCase(testCase: RehypeMermaidTestCase): void {
  const result = evaluateRehypeMermaidCase(testCase);
  if (!result.ok) throw new Error(result.error);
}

export type RehypeMermaidCaseResult = AstUiCaseResult<TestTreeNode>;

/**
 * 评估解析层。
 *
 * @param testCase 用例。
 */
export function evaluateRehypeMermaidCase(
  testCase: RehypeMermaidTestCase
): RehypeMermaidCaseResult {
  let tree: TestTreeNode | null = null;
  let thrown: unknown;
  try {
    tree = parseMermaidMarkdown(testCase.markdown);
  } catch (error) {
    thrown = error;
  }

  try {
    assertRehypeMermaidCase(testCase, tree, thrown);
    return { ok: true, parseOk: true, uiOk: null, tree };
  } catch (error) {
    const parseError = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      parseOk: false,
      uiOk: null,
      tree,
      parseError,
      error: parseError
    };
  }
}

function assertOptional<T>(
  testCase: RehypeMermaidTestCase,
  field: keyof RehypeMermaidExpectation,
  expected: T | undefined,
  actual: T,
  equal: (expected: T, actual: T) => boolean
): void {
  if (expected === undefined) return;
  if (!equal(expected, actual)) {
    fail(
      testCase,
      `${String(field)} 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`
    );
  }
}

function fail(testCase: RehypeMermaidTestCase, message: string): never {
  throw new Error(`[${testCase.id}] ${message}`);
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
