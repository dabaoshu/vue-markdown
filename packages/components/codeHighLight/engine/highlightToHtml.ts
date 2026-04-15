import hljs from 'highlight.js';
import type { HighlightToHtmlOptions } from '../core/types';
import { escapeHtml } from '../core/escapeHtml';

/**
 * 使用 highlight.js 将代码转成 HTML 片段。
 *
 * @param code 原始代码
 * @param options 高亮配置
 * @returns 高亮后的 HTML 字符串
 */
export const highlightTohtml = (
  code: string,
  options: HighlightToHtmlOptions
): string => {
  const { language, ignoreIllegals, autoMatch } = options;
  const autoDetect = autoMatch || !language;

  if (language && !hljs.getLanguage(language)) {
    console.warn(`The language "${language}" you specified could not be found.`);
    return escapeHtml(code);
  }

  if (autoDetect) {
    return hljs.highlightAuto(code).value;
  }

  return hljs.highlight(code, { language, ignoreIllegals }).value;
};

/**
 * 判断 highlight.js 是否支持指定语言。
 *
 * @param language 语言名称
 * @returns 是否支持
 */
export const hljsGetLanguage = (language: string) => {
  return hljs.getLanguage(language);
};
