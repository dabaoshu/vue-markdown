import type { HighlightOptions } from 'highlight.js';

/**
 * 代码高亮引擎类型。
 */
export type CodeHighlightGeneratorType = 'highlight' | 'refractor';

/**
 * highlight.js 渲染参数。
 */
export type HighlightToHtmlOptions = HighlightOptions & {
  /**
   * 是否启用自动语言识别。
   */
  autoMatch: boolean;
};

/**
 * refractor 渲染参数。
 */
export type RefractorToHtmlOptions = {
  /**
   * 目标语言。
   */
  language: string;
  /**
   * 主题对象，当前仅透传预留。
   */
  theme?: Record<string, unknown>;
};
