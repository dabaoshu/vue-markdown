const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i;

/**
 * 将 URL 转换为安全值。
 * @param {string} value 原始 URL
 * @returns {string} 过滤后的 URL
 */
export function defaultUrlTransform(value: string): string {
  const colon = value.indexOf(':');
  const questionMark = value.indexOf('?');
  const numberSign = value.indexOf('#');
  const slash = value.indexOf('/');

  if (
    colon < 0 ||
    (slash > -1 && colon > slash) ||
    (questionMark > -1 && colon > questionMark) ||
    (numberSign > -1 && colon > numberSign) ||
    safeProtocol.test(value.slice(0, colon))
  ) {
    return value;
  }

  return '';
}
