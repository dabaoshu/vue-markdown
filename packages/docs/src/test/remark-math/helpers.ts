import { unified } from 'unified';
import remarkParse from 'remark-parse';
import RemarkMath from 'remark-math';
import type { AstUiCaseResult } from '../_shared/astUiTypes';
import {
  arraysEqual,
  collectNodesByType,
  treeText,
  treeToDisplayJson,
  type TestTreeNode
} from '../_shared/astUiHelpers';
import type { RemarkMathExpectation, RemarkMathTestCase } from './types';

export type { TestTreeNode };
export { treeToDisplayJson };

/**
 * 解析 Markdown；mathEnabled 时注入 remark-math。
 *
 * @param markdown 输入。
 * @param options.mathEnabled 是否启用 remark-math。
 */
export function parseMathMarkdown(
  markdown: string,
  options: { mathEnabled?: boolean } = {}
): TestTreeNode {
  const mathEnabled = options.mathEnabled !== false;
  const processor = unified().use(remarkParse);
  if (mathEnabled) {
    processor.use(RemarkMath);
  }
  const tree = processor.parse(markdown) as TestTreeNode;
  return processor.runSync(tree) as TestTreeNode;
}

/**
 * 收集所有数学节点的 value。
 *
 * @param root 根节点。
 */
function collectMathValues(root: TestTreeNode): string[] {
  return [
    ...collectNodesByType(root, 'inlineMath'),
    ...collectNodesByType(root, 'math')
  ]
    .map((n) => n.value ?? '')
    .filter(Boolean);
}

/**
 * AST 断言。
 *
 * @param testCase 用例。
 * @param tree 解析树。
 * @param thrown 异常。
 */
export function assertRemarkMathCase(
  testCase: RemarkMathTestCase,
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
  const inlines = collectNodesByType(root, 'inlineMath');
  const blocks = collectNodesByType(root, 'math');
  const mathValues = collectMathValues(root);

  assertOptional(
    testCase,
    'rootChildTypes',
    expectation.rootChildTypes,
    rootTypes,
    arraysEqual
  );
  assertOptional(
    testCase,
    'inlineMathCount',
    expectation.inlineMathCount,
    inlines.length,
    (a, b) => a === b
  );
  assertOptional(
    testCase,
    'mathCount',
    expectation.mathCount,
    blocks.length,
    (a, b) => a === b
  );

  if (expectation.noMathNodes && (inlines.length > 0 || blocks.length > 0)) {
    fail(
      testCase,
      `期望无数学节点，实际 inlineMath=${inlines.length}, math=${blocks.length}`
    );
  }

  for (const snippet of expectation.mathValueIncludes ?? []) {
    if (!mathValues.some((v) => v.includes(snippet))) {
      fail(
        testCase,
        `mathValueIncludes 未命中: ${JSON.stringify(snippet)}；实际 values=${JSON.stringify(mathValues)}`
      );
    }
  }

  for (const snippet of expectation.contentIncludes ?? []) {
    if (!text.includes(snippet)) {
      fail(testCase, `contentIncludes 未命中: ${JSON.stringify(snippet)}`);
    }
  }
  for (const snippet of expectation.contentExcludes ?? []) {
    if (text.includes(snippet)) {
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
export function runRemarkMathCase(testCase: RemarkMathTestCase): void {
  const result = evaluateRemarkMathCase(testCase);
  if (!result.ok) throw new Error(result.error);
}

export type RemarkMathCaseResult = AstUiCaseResult<TestTreeNode>;

/**
 * 评估解析层。
 *
 * @param testCase 用例。
 */
export function evaluateRemarkMathCase(
  testCase: RemarkMathTestCase
): RemarkMathCaseResult {
  let tree: TestTreeNode | null = null;
  let thrown: unknown;
  try {
    tree = parseMathMarkdown(testCase.markdown, {
      mathEnabled: testCase.mathEnabled
    });
  } catch (error) {
    thrown = error;
  }

  try {
    assertRemarkMathCase(testCase, tree, thrown);
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
  testCase: RemarkMathTestCase,
  field: keyof RemarkMathExpectation,
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

function fail(testCase: RemarkMathTestCase, message: string): never {
  throw new Error(`[${testCase.id}] ${message}`);
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
