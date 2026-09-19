/**
 * 文档站 AST+UI 测试套件在 `/test?tab=` 下的 Tab id。
 */
export type TestTabId =
  | 'gfm'
  | 'math'
  | 'code'
  | 'mermaid'
  | 'http'
  | 'think';

/**
 * 单个测试 Tab 的展示与旧路径。
 */
export interface TestTabMeta {
  id: TestTabId;
  /** 顶部分组按钮文案 */
  label: string;
  /** 旧独立路由，进入后重定向到 `/test?tab=` */
  legacyPath: string;
}

/** 非法或缺失 query.tab 时的默认套件 */
export const DEFAULT_TEST_TAB_ID: TestTabId = 'gfm';

/** 顶栏合并后的测试 Tab 顺序（原顶栏从左到右） */
export const TEST_TAB_LIST: readonly TestTabMeta[] = [
  { id: 'gfm', label: 'GFM', legacyPath: '/test/remark-gfm' },
  { id: 'math', label: 'Math', legacyPath: '/test/remark-math' },
  { id: 'code', label: 'Code', legacyPath: '/test/code-highlight' },
  { id: 'mermaid', label: 'Mermaid', legacyPath: '/test/rehype-mermaid' },
  { id: 'http', label: 'HTTP', legacyPath: '/test/remark-http-resource' },
  { id: 'think', label: 'Think', legacyPath: '/test/remark-think' }
];

const TEST_TAB_ID_SET = new Set<string>(TEST_TAB_LIST.map((tab) => tab.id));

/**
 * 把 URL query.tab 收成合法 TestTabId。
 *
 * @param raw `route.query.tab`
 */
export function resolveTestTabId(raw: unknown): TestTabId {
  const id = typeof raw === 'string' ? raw : DEFAULT_TEST_TAB_ID;
  return TEST_TAB_ID_SET.has(id) ? (id as TestTabId) : DEFAULT_TEST_TAB_ID;
}
