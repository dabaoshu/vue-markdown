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
  CodeHighlightExpectation,
  CodeHighlightTestCase
} from './types';

export type { TestTreeNode };
export { treeToDisplayJson };

/**
 * 解析 Markdown（仅 remark-parse，代码围栏为原生 mdast code）。
 *
 * @param markdown 输入。
 */
export function parseCodeMarkdown(markdown: string): TestTreeNode {
  const processor = unified().use(remarkParse);
  const tree = processor.parse(markdown) as TestTreeNode;
  return processor.runSync(tree) as TestTreeNode;
}

/**
 * AST 断言。
 *
 * @param testCase 用例。
 * @param tree 解析树。
 * @param thrown 异常。
 */
export function assertCodeHighlightCase(
  testCase: CodeHighlightTestCase,
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

  if (expectation.firstCodeLang !== undefined) {
    const actual = codes[0]?.lang ?? null;
    if (actual !== expectation.firstCodeLang) {
      fail(
        testCase,
        `firstCodeLang 期望 ${JSON.stringify(expectation.firstCodeLang)}，实际 ${JSON.stringify(actual)}`
      );
    }
  }

  if (expectation.noCodeFence && codes.length > 0) {
    fail(testCase, `期望无围栏 code，实际 ${codes.length}`);
  }

  const codeValues = codes.map((c) => c.value ?? '').join('\n');
  for (const snippet of expectation.codeValueIncludes ?? []) {
    if (!codeValues.includes(snippet)) {
      fail(testCase, `codeValueIncludes 未命中: ${JSON.stringify(snippet)}`);
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
export function runCodeHighlightCase(testCase: CodeHighlightTestCase): void {
  const result = evaluateCodeHighlightCase(testCase);
  if (!result.ok) throw new Error(result.error);
}

export type CodeHighlightCaseResult = AstUiCaseResult<TestTreeNode>;

/**
 * 评估解析层。
 *
 * @param testCase 用例。
 */
export function evaluateCodeHighlightCase(
  testCase: CodeHighlightTestCase
): CodeHighlightCaseResult {
  let tree: TestTreeNode | null = null;
  let thrown: unknown;
  try {
    tree = parseCodeMarkdown(testCase.markdown);
  } catch (error) {
    thrown = error;
  }

  try {
    assertCodeHighlightCase(testCase, tree, thrown);
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
  testCase: CodeHighlightTestCase,
  field: keyof CodeHighlightExpectation,
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

function fail(testCase: CodeHighlightTestCase, message: string): never {
  throw new Error(`[${testCase.id}] ${message}`);
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
