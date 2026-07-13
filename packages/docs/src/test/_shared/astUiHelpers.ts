import type { AstUiCaseResult, AstUiExpectation, AstUiSelectorExpect } from './astUiTypes';

/** mdast / hast 宽松节点（仅测试断言需要的字段） */
export interface TestTreeNode {
  type?: string;
  tagName?: string;
  value?: string;
  lang?: string | null;
  meta?: unknown;
  checked?: boolean | null;
  children?: TestTreeNode[];
  data?: {
    hChildren?: TestTreeNode[];
    hName?: string;
    value?: string;
  };
}

/**
 * 深度遍历树节点（含 data.hChildren）。
 *
 * @param node 根节点。
 * @param visit 访问回调。
 * @param parent 父节点。
 */
export function walkTree(
  node: TestTreeNode,
  visit: (node: TestTreeNode, parent?: TestTreeNode) => void,
  parent?: TestTreeNode
): void {
  visit(node, parent);
  for (const child of node.children ?? []) {
    walkTree(child, visit, node);
  }
  for (const child of node.data?.hChildren ?? []) {
    walkTree(child, visit, node);
  }
}

/**
 * 收集指定 type 的节点。
 *
 * @param node 根节点。
 * @param type 目标 type。
 */
export function collectNodesByType(
  node: TestTreeNode,
  type: string
): TestTreeNode[] {
  const result: TestTreeNode[] = [];
  walkTree(node, (n) => {
    if (n.type === type) result.push(n);
  });
  return result;
}

/**
 * 提取节点可读文本。
 *
 * @param node 任意节点。
 */
export function extractText(node: TestTreeNode): string {
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
 * 整棵树文本序列化。
 *
 * @param node 根节点。
 */
export function treeText(node: TestTreeNode): string {
  return extractText(node);
}

/**
 * 将树转为便于展示的 JSON（去掉 position）。
 *
 * @param tree 树节点。
 */
export function treeToDisplayJson(tree: TestTreeNode | null): string {
  if (!tree) return 'null';
  return JSON.stringify(
    tree,
    (key, value) => (key === 'position' ? undefined : value),
    2
  );
}

/**
 * 比较两个字符串数组是否相等。
 *
 * @param a 期望。
 * @param b 实际。
 */
export function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * 规范化选择器期望。
 *
 * @param item 字符串或带 count/min 的对象。
 */
export function normalizeUiSelector(
  item: string | AstUiSelectorExpect
): AstUiSelectorExpect {
  return typeof item === 'string' ? { selector: item } : item;
}

/**
 * 对预览根节点执行通用 UI 断言；失败抛错。
 *
 * @param root 预览 DOM 根节点。
 * @param caseId 用例 ID。
 * @param ui UI 期望。
 */
export function assertAstUi(
  root: ParentNode,
  caseId: string,
  ui: AstUiExpectation
): void {
  const text = (root.textContent || '').replace(/\s+/g, ' ').trim();

  for (const item of ui.has ?? []) {
    const rule = normalizeUiSelector(item);
    const count = root.querySelectorAll(rule.selector).length;
    if (rule.count !== undefined && count !== rule.count) {
      throw new Error(
        `[${caseId}] UI ${rule.selector} 期望 count=${rule.count}，实际 ${count}`
      );
    }
    if (rule.min !== undefined && count < rule.min) {
      throw new Error(
        `[${caseId}] UI ${rule.selector} 期望至少 ${rule.min}，实际 ${count}`
      );
    }
    if (rule.count === undefined && rule.min === undefined && count < 1) {
      throw new Error(`[${caseId}] UI 缺少选择器 ${rule.selector}`);
    }
  }

  for (const selector of ui.missing ?? []) {
    const count = root.querySelectorAll(selector).length;
    if (count > 0) {
      throw new Error(`[${caseId}] UI 不应存在 ${selector}，实际 ${count}`);
    }
  }

  for (const snippet of ui.textIncludes ?? []) {
    if (!text.includes(snippet)) {
      throw new Error(
        `[${caseId}] UI 文本未包含 ${JSON.stringify(snippet)}；实际: ${JSON.stringify(text.slice(0, 200))}`
      );
    }
  }

  for (const snippet of ui.textExcludes ?? []) {
    if (text.includes(snippet)) {
      throw new Error(
        `[${caseId}] UI 文本不应包含 ${JSON.stringify(snippet)}`
      );
    }
  }
}

/**
 * 在已有解析结果上叠加 UI 断言结果。
 *
 * @param parseResult 解析层结果。
 * @param uiError UI 断言错误信息；null/undefined 表示通过。
 */
export function mergeUiResult<TTree>(
  parseResult: AstUiCaseResult<TTree>,
  uiError?: string | null
): AstUiCaseResult<TTree> {
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
 * 运行 CLI 套件并打印结果。
 *
 * @param suiteName 套件名。
 * @param cases 用例列表。
 * @param runCase 单条运行函数（失败抛错）。
 */
export function runAstSuiteCli<TCase extends { id: string; title: string }>(
  suiteName: string,
  cases: TCase[],
  runCase: (testCase: TCase) => void
): boolean {
  let passed = 0;
  const failures: Array<{ id: string; message: string }> = [];

  for (const testCase of cases) {
    try {
      runCase(testCase);
      passed += 1;
      console.log(`✓ ${testCase.id} — ${testCase.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ id: testCase.id, message });
      console.error(`✗ ${testCase.id} — ${testCase.title}`);
      console.error(`  ${message}`);
    }
  }

  console.log('');
  console.log(
    `${suiteName}: ${passed}/${cases.length} passed` +
      (failures.length ? `, ${failures.length} failed` : '')
  );

  if (failures.length) {
    console.log('\nFailed cases:');
    for (const item of failures) {
      console.log(`- ${item.id}: ${item.message}`);
    }
  }

  return failures.length === 0;
}
