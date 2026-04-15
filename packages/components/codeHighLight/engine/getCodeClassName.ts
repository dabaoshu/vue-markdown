import { hljsGetLanguage } from './highlightToHtml';

/**
 * 计算 code 标签 className。
 *
 * @param language 指定语言
 * @param autoMatch 是否自动识别语言
 * @returns code 节点 className
 */
export const getCodeClassName = (
  language: string,
  autoMatch: boolean
): string => {
  const autoDetect = autoMatch || !language;
  const cannotDetectLanguage = !autoDetect && !hljsGetLanguage(language);

  if (cannotDetectLanguage) {
    return '';
  }

  return `hljs ${language}`;
};
