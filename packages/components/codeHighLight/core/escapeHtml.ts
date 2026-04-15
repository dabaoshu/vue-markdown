/**
 * 转义代码文本中的 HTML 特殊字符，避免直接注入。
 *
 * @param value 原始代码文本
 * @returns 转义后的文本
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
