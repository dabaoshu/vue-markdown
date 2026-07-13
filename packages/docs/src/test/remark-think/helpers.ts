import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkThink } from '../../../../components/remark-think';
import { MergeThinkRemark } from '../../../../components/componentsUtils/engine/mergeThinkRemark';
import type { RemarkThinkExpectation, RemarkThinkTestCase } from './types';

/** mdast 宽松节点形态（仅测试断言需要的字段） */
export interface TestMdastNode {
  type?: string;
  tagName?: string;
  value?: string;
  children?: TestMdastNode[];
  meta?: { loading?: boolean };
  data?: {
    hChildren?: TestMdastNode[];
    value?: string;
  };
}

/**
 * 构造 opening / closing 标签，避免在源码里硬编码完整尖括号标签名时被工具误改写。
 *
 * @param tag 标签名，默认 think。
 */
export function thinkTags(tag = 'think') {
  return {
    open: `<${tag}>`,
    close: `</${tag}>`,
    tag
  };
}

/**
 * 解析 Markdown，注入 remarkThink，可选 MergeThinkRemark。
 *
 * @param markdown 输入。
 * @param options.tags 可识别标签。
 * @param options.merge 是否合并连续 thinkFlow。
 * @returns mdast 根节点。
 */
export function parseThinkMarkdown(
  markdown: string,
  options: { tags?: string[]; merge?: boolean } = {}
): TestMdastNode {
  const tags = options.tags ?? ['think'];
  const processor = unified()
    .use(remarkParse)
    .use(remarkThink, { tags });

  if (options.merge) {
    processor.use(MergeThinkRemark);
  }

  const tree = processor.parse(markdown) as TestMdastNode;
  // MergeThinkRemark 是 transformer，需要 run 才会生效
  if (options.merge) {
    // unified parse 不同步执行 plugin transform；对 sync transformer 用 runSync
    return processor.runSync(tree) as TestMdastNode;
  }
  return tree;
}

/**
 * 深度收集指定 type 的节点。
 *
 * @param node 根节点。
 * @param type 目标 type。
 */
export function collectNodesByType(
  node: TestMdastNode,
  type: string
): TestMdastNode[] {
  const result: TestMdastNode[] = [];
  walk(node, (n) => {
    if (n.type === type) result.push(n);
  });
  return result;
}

/**
 * 收集段落内的自定义 think 行内节点。
 *
 * @param node 根节点。
 * @param tagName 标签名。
 */
export function collectInlineElements(
  node: TestMdastNode,
  tagName: string
): TestMdastNode[] {
  const result: TestMdastNode[] = [];
  walk(node, (n, parent) => {
    if (parent?.type !== 'paragraph') return;
    const isInlineThink =
      n.type === 'thinkInline' ||
      (n.type === 'element' && n.tagName === tagName);
    const matchedTag =
      n.tagName === tagName ||
      (n.data as { hName?: string } | undefined)?.hName === tagName;
    if (isInlineThink && matchedTag) {
      result.push(n);
    }
  });
  return result;
}

/**
 * 提取 think 节点可读文本（含 hChildren / children / value）。
 *
 * @param node 任意节点。
 */
export function extractText(node: TestMdastNode): string {
  if (typeof node.value === 'string' && node.type === 'text') {
    return node.value;
  }

  const fromHChildren =
    node.data?.hChildren?.map((c) => extractText(c)).join('') ?? '';
  if (fromHChildren) return fromHChildren;

  if (node.children?.length) {
    return node.children.map((c) => extractText(c)).join('');
  }

  if (typeof node.value === 'string') return node.value;
  return '';
}

/**
 * 整棵树文本序列化，便于 contentIncludes 断言。
 *
 * @param node 根节点。
 */
export function treeText(node: TestMdastNode): string {
  return extractText(node);
}

/**
 * 对单条用例执行断言，失败时抛出带用例 ID 的 Error。
 *
 * @param testCase 用例。
 * @param tree 解析结果；若解析抛错则传入 null，并由 thrown 携带错误。
 * @param thrown 解析阶段异常。
 */
export function assertRemarkThinkCase(
  testCase: RemarkThinkTestCase,
  tree: TestMdastNode | null,
  thrown?: unknown
): void {
  const expectation = testCase.expect;
  const noThrow = expectation.noThrow !== false;

  if (thrown) {
    if (noThrow) {
      fail(
        testCase,
        `期望不抛错，实际抛出: ${stringifyError(thrown)}`
      );
    }
    return;
  }

  if (!tree) {
    fail(testCase, '解析结果为空');
  }

  const root = tree!;
  const rootTypes = (root.children ?? []).map((c) => c.type ?? '');
  const thinkFlows = collectNodesByType(root, 'thinkFlow');
  const thinkGroups = collectNodesByType(root, 'thinkGroup');
  const text = treeText(root);

  assertOptional(
    testCase,
    'rootChildTypes',
    expectation.rootChildTypes,
    rootTypes,
    (expected, actual) => arraysEqual(expected, actual)
  );

  assertOptional(
    testCase,
    'thinkFlowCount',
    expectation.thinkFlowCount,
    thinkFlows.length,
    (expected, actual) => expected === actual
  );

  assertOptional(
    testCase,
    'thinkGroupCount',
    expectation.thinkGroupCount,
    thinkGroups.length,
    (expected, actual) => expected === actual
  );

  if (expectation.firstThinkGroupSize !== undefined) {
    const first = thinkGroups[0];
    const size = first?.children?.length ?? -1;
    if (size !== expectation.firstThinkGroupSize) {
      fail(
        testCase,
        `firstThinkGroupSize 期望 ${expectation.firstThinkGroupSize}，实际 ${size}`
      );
    }
  }

  if (expectation.inlineTagName) {
    const inlines = collectInlineElements(root, expectation.inlineTagName);
    if (inlines.length === 0) {
      fail(
        testCase,
        `期望段落内存在 <${expectation.inlineTagName}> 行内节点，实际未找到`
      );
    }
  }

  if (expectation.noThinkNodes) {
    if (thinkFlows.length > 0 || thinkGroups.length > 0) {
      fail(
        testCase,
        `期望无 think 节点，实际 thinkFlow=${thinkFlows.length}, thinkGroup=${thinkGroups.length}`
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
      fail(testCase, `contentExcludes 命中了不应出现的: ${JSON.stringify(snippet)}`);
    }
  }
}

/**
 * 运行单条用例：解析 + 断言。
 *
 * @param testCase 用例。
 */
export function runRemarkThinkCase(testCase: RemarkThinkTestCase): void {
  const result = evaluateRemarkThinkCase(testCase);
  if (!result.ok) {
    throw new Error(result.error);
  }
}

/**
 * 单条用例的可视化/页面评估结果。
 */
export interface RemarkThinkCaseResult {
  /** 综合是否通过（解析 + UI） */
  ok: boolean;
  /** 解析断言是否通过 */
  parseOk: boolean;
  /** UI 断言是否通过；未检测时为 null */
  uiOk: boolean | null;
  /** 失败原因（优先 UI，其次解析） */
  error?: string;
  /** 解析失败原因 */
  parseError?: string;
  /** UI 失败原因 */
  uiError?: string;
  /** 解析后的 mdast（失败时也可能有部分树） */
  tree: TestMdastNode | null;
}

/**
 * 仅评估解析层断言。
 *
 * @param testCase 用例。
 */
export function evaluateRemarkThinkCase(
  testCase: RemarkThinkTestCase
): RemarkThinkCaseResult {
  let tree: TestMdastNode | null = null;
  let thrown: unknown;

  try {
    tree = parseThinkMarkdown(testCase.markdown, {
      tags: testCase.tags,
      merge: testCase.merge
    });
  } catch (error) {
    thrown = error;
  }

  try {
    assertRemarkThinkCase(testCase, tree, thrown);
    return {
      ok: true,
      parseOk: true,
      uiOk: null,
      tree
    };
  } catch (error) {
    const parseError =
      error instanceof Error ? error.message : String(error);
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

/**
 * 在已有解析结果上叠加 UI 断言结果。
 *
 * @param parseResult 解析层结果。
 * @param uiError UI 断言错误信息；null/undefined 表示通过或未跑。
 */
export function mergeUiResult(
  parseResult: RemarkThinkCaseResult,
  uiError?: string | null
): RemarkThinkCaseResult {
  if (uiError == null) {
    const uiOk = true;
    const ok = parseResult.parseOk && uiOk;
    return {
      ...parseResult,
      uiOk,
      uiError: undefined,
      ok,
      error: ok ? undefined : parseResult.parseError
    };
  }

  return {
    ...parseResult,
    uiOk: false,
    uiError,
    ok: false,
    error: uiError
  };
}

/**
 * 将 mdast 转为便于展示的 JSON（去掉 position）。
 *
 * @param tree mdast 节点。
 */
export function treeToDisplayJson(tree: TestMdastNode | null): string {
  if (!tree) return 'null';
  return JSON.stringify(
    tree,
    (key, value) => (key === 'position' ? undefined : value),
    2
  );
}

function walk(
  node: TestMdastNode,
  visit: (node: TestMdastNode, parent?: TestMdastNode) => void,
  parent?: TestMdastNode
): void {
  visit(node, parent);
  for (const child of node.children ?? []) {
    walk(child, visit, node);
  }
  for (const child of node.data?.hChildren ?? []) {
    walk(child, visit, node);
  }
}

function assertOptional<T>(
  testCase: RemarkThinkTestCase,
  field: keyof RemarkThinkExpectation,
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

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function fail(testCase: RemarkThinkTestCase, message: string): never {
  throw new Error(`[${testCase.id}] ${message}`);
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
