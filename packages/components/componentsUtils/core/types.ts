/**
 * Markdown 节点的最小结构定义。
 */
export interface MarkdownLikeNode {
  type?: string;
  tagName?: string;
  value?: string;
  children?: MarkdownLikeNode[];
}

/**
 * 表格解析类型。
 */
export type TableParseType = 'string' | 'object';

/**
 * 表格解析配置。
 */
export interface TableNodeParseOptions {
  /**
   * 是否在对象行数据中注入 `__uuid`。
   */
  uuid?: boolean;
  /**
   * 返回的数据结构类型。
   */
  type?: TableParseType;
}

/**
 * 对象行结构。
 */
export interface TableObjectRow extends Record<string, string | number> {
  __uuid?: number;
}

/**
 * 字符串行模式的返回值。
 */
export interface TableStringResult {
  columns: string[];
  data: string[][];
}

/**
 * 对象行模式的返回值。
 */
export interface TableObjectResult {
  columns: string[];
  data: TableObjectRow[];
}

/**
 * 表格解析返回值联合类型。
 */
export type TableNodeParseResult = TableStringResult | TableObjectResult;
