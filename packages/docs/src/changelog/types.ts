/**
 * Keep a Changelog 分类，对应页面上的类型标记。
 */
export type ChangelogKind = 'added' | 'changed' | 'fixed' | 'removed';

/**
 * 单个变更条目。
 */
export interface ChangelogItem {
  /** 变更分类 */
  kind: ChangelogKind;
  /** 条目正文（可含行内 `code`） */
  text: string;
}

/**
 * 一个已发布的具体版本区块。
 */
export interface ChangelogRelease {
  /** 页内锚点 id，不含 `#` */
  id: string;
  /** 版本号，如 1.0.5 */
  label: string;
  /** ISO 日期 */
  date: string | null;
  /** 分类条目 */
  items: ChangelogItem[];
  /** 无条目时的说明段落 */
  note: string | null;
}
