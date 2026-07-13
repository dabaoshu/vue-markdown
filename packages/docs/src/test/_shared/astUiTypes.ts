/**
 * AST + UI 测试页共用的 UI 断言类型。
 */

/** 选择器期望（精确数量或至少数量） */
export interface AstUiSelectorExpect {
  /** CSS 选择器 */
  selector: string;
  /** 精确匹配数量 */
  count?: number;
  /** 至少数量 */
  min?: number;
}

/**
 * 对挂载后预览 DOM 的断言描述。
 */
export interface AstUiExpectation {
  /** 必须存在的选择器 */
  has?: Array<string | AstUiSelectorExpect>;
  /** 必须不存在的选择器 */
  missing?: string[];
  /** 预览可见文本应包含 */
  textIncludes?: string[];
  /** 预览可见文本不应包含 */
  textExcludes?: string[];
}

/**
 * 解析层 + UI 层综合结果（供可视化页使用）。
 */
export interface AstUiCaseResult<TTree = unknown> {
  /** 综合是否通过（parseOk && uiOk） */
  ok: boolean;
  /** AST 断言是否通过 */
  parseOk: boolean;
  /** UI 断言是否通过；未检测时为 null */
  uiOk: boolean | null;
  /** 失败原因（优先 UI，其次解析） */
  error?: string;
  /** 解析失败原因 */
  parseError?: string;
  /** UI 失败原因 */
  uiError?: string;
  /** 解析后的树 */
  tree: TTree | null;
}
