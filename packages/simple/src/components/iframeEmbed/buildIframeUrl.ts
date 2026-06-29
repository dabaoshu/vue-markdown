import type { IframeEmbedParams } from './types';

/**
 * 将参数序列化为 URL 查询字符串（忽略 undefined / null / 空字符串）。
 */
export function serializeIframeParams(params: IframeEmbedParams): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    search.set(key, String(value));
  });

  return search.toString();
}

/**
 * 将基础地址与参数合并为 iframe `src`。
 */
export function buildIframeUrl(baseUrl: string, params: IframeEmbedParams): string {
  const query = serializeIframeParams(params);
  if (!query) {
    return baseUrl;
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${query}`;
}
