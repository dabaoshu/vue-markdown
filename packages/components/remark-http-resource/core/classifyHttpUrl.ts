import { buildExtensionLookup } from './extensions';
import type {
  ClassifyContext,
  ClassifyResult,
  HttpResource,
  HttpResourceOptions
} from './types';

/**
 * 从 pathname 取最后一段的最后一个后缀。
 *
 * @param pathname URL pathname。
 * @returns 小写无点后缀；无后缀或以点结尾时为 null。
 */
export function extFromPathname(pathname: string): string | null {
  const last = pathname.endsWith('/')
    ? pathname.slice(0, -1).split('/').pop() ?? ''
    : pathname.split('/').pop() ?? '';
  const dot = last.lastIndexOf('.');
  if (dot <= 0 || dot === last.length - 1) return null;
  return last.slice(dot + 1).toLowerCase();
}

/**
 * 把自定义回调结果收成 HttpResource；未命中返回 null。
 *
 * @param result 回调返回值。
 * @param ctx 上下文。
 */
function fromClassifyResult(
  result: ClassifyResult,
  ctx: ClassifyContext
): HttpResource | null {
  if (result == null) return null;
  if (typeof result === 'string') {
    if (result.trim() === '') return null;
    return { kind: result, ext: ctx.ext, url: ctx.url };
  }
  if (typeof result === 'object' && typeof result.kind === 'string') {
    if (result.kind.trim() === '') return null;
    const ext = 'ext' in result ? (result.ext ?? null) : ctx.ext;
    return { kind: result.kind, ext, url: ctx.url };
  }
  return null;
}

/**
 * 对单个 URL 做 http(s) 资源分类。
 *
 * @param url 原始字符串。
 * @param options 自定义回调与扩展名 overlay。
 * @returns 分类结果；非 http(s) 绝对地址时为 null。
 */
export function classifyHttpUrl(
  url: string,
  options: HttpResourceOptions = {}
): HttpResource | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }
  if (!parsed.hostname) return null;

  const ext = extFromPathname(parsed.pathname);
  const ctx: ClassifyContext = {
    protocol: parsed.protocol,
    pathname: parsed.pathname,
    ext,
    url: trimmed
  };

  if (options.classify) {
    try {
      const custom = fromClassifyResult(options.classify(trimmed, ctx), ctx);
      if (custom) return custom;
    } catch (error) {
      console.warn('[remark-http-resource] classify() threw; falling back to extension table', error);
    }
  }

  if (ext) {
    const kind = buildExtensionLookup(options.extensions).get(ext);
    if (kind) {
      return { kind, ext, url: trimmed };
    }
  }

  return { kind: 'webpage', ext, url: trimmed };
}
