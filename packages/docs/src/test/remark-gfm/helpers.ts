import { unified } from 'unified';
import remarkParse from 'remark-parse';
import RemarkGfm from 'remark-gfm';
import RemarkBreaks from 'remark-breaks';
import type { AstUiCaseResult } from '../_shared/astUiTypes';
import {
  arraysEqual,
  collectNodesByType,
  treeText,
  treeToDisplayJson,
  type TestTreeNode,
  walkTree
} from '../_shared/astUiHelpers';
import type { RemarkGfmExpectation, RemarkGfmTestCase } from './types';

export type { TestTreeNode };
export { treeToDisplayJson };

/**
 * 解析 Markdown，按用例开关注入 remark-gfm / remark-breaks。
 *
 * @param markdown 输入。
 * @param options.gfm 是否启用 GFM，默认 true。
 * @param options.breaks 是否启用 breaks，默认 false。
 */
export function parseGfmMarkdown(
  markdown: string,
  options: { gfm?: boolean; breaks?: boolean } = {}
): TestTreeNode {
  const gfm = options.gfm !== false;
  const breaks = options.breaks === true;
  const processor = unified().use(remarkParse);

  if (breaks) {
    processor.use(RemarkBreaks);
  }
  if (gfm) {
    processor.use(RemarkGfm, { singleTilde: false });
  }

  const tree = processor.parse(markdown) as TestTreeNode;
  return processor.runSync(tree) as TestTreeNode;
}

/**
 * 统计 checked 为指定值的 listItem。
 *
 * @param node 根节点。
 * @param checked 期望 checked。
 */
function countCheckedItems(node: TestTreeNode, checked: boolean): number {
  let count = 0;
  walkTree(node, (n) => {
    if (n.type === 'listItem' && n.checked === checked) count += 1;
  });
  return count;
}

/**
 * 对单条用例执行 AST 断言。
 *
 * @param testCase 用例。
 * @param tree 解析结果。
 * @param thrown 解析异常。
 */
export function assertRemarkGfmCase(
  testCase: RemarkGfmTestCase,
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

  if (!tree) {
    fail(testCase, '解析结果为空');
  }

  const root = tree!;
  const rootTypes = (root.children ?? []).map((c) => c.type ?? '');
  const text = treeText(root);
  const tables = collectNodesByType(root, 'table');
  const deletes = collectNodesByType(root, 'delete');
  const breaks = collectNodesByType(root, 'break');
  const links = collectNodesByType(root, 'link');

  assertOptional(
    testCase,
    'rootChildTypes',
    expectation.rootChildTypes,
    rootTypes,
    arraysEqual
  );
  assertOptional(
    testCase,
    'tableCount',
    expectation.tableCount,
    tables.length,
    (a, b) => a === b
  );
  assertOptional(
    testCase,
    'deleteCount',
    expectation.deleteCount,
    deletes.length,
    (a, b) => a === b
  );
  assertOptional(
    testCase,
    'breakCount',
    expectation.breakCount,
    breaks.length,
    (a, b) => a === b
  );
  assertOptional(
    testCase,
    'linkCount',
    expectation.linkCount,
    links.length,
    (a, b) => a === b
  );
  assertOptional(
    testCase,
    'checkedTrueCount',
    expectation.checkedTrueCount,
    countCheckedItems(root, true),
    (a, b) => a === b
  );
  assertOptional(
    testCase,
    'checkedFalseCount',
    expectation.checkedFalseCount,
    countCheckedItems(root, false),
    (a, b) => a === b
  );

  if (expectation.noTable && tables.length > 0) {
    fail(testCase, `期望无 table，实际 ${tables.length}`);
  }
  if (expectation.noDelete && deletes.length > 0) {
    fail(testCase, `期望无 delete，实际 ${deletes.length}`);
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
 * 运行单条用例：解析 + 断言。
 *
 * @param testCase 用例。
 */
export function runRemarkGfmCase(testCase: RemarkGfmTestCase): void {
  const result = evaluateRemarkGfmCase(testCase);
  if (!result.ok) {
    throw new Error(result.error);
  }
}

/** 单条可视化评估结果 */
export type RemarkGfmCaseResult = AstUiCaseResult<TestTreeNode>;

/**
 * 仅评估解析层断言。
 *
 * @param testCase 用例。
 */
export function evaluateRemarkGfmCase(
  testCase: RemarkGfmTestCase
): RemarkGfmCaseResult {
  let tree: TestTreeNode | null = null;
  let thrown: unknown;

  try {
    tree = parseGfmMarkdown(testCase.markdown, {
      gfm: testCase.gfm,
      breaks: testCase.breaks
    });
  } catch (error) {
    thrown = error;
  }

  try {
    assertRemarkGfmCase(testCase, tree, thrown);
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
  testCase: RemarkGfmTestCase,
  field: keyof RemarkGfmExpectation,
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

function fail(testCase: RemarkGfmTestCase, message: string): never {
  throw new Error(`[${testCase.id}] ${message}`);
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
