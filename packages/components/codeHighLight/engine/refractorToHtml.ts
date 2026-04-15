import { toHtml } from 'hast-util-to-html';
import { refractor } from 'refractor';
import type { RefractorToHtmlOptions } from '../core/types';

/**
 * 使用 refractor 将代码转成 HTML 片段。
 *
 * @param code 原始代码
 * @param options 渲染参数
 * @returns 高亮后的 HTML 字符串
 */
export const refractorToHtml = (
  code: string,
  options: RefractorToHtmlOptions
): string => {
  const { language } = options;
  const tree = refractor.highlight(code, language);
  return toHtml(tree, {});
};
