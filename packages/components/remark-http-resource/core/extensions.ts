import type { BuiltinHttpResourceKind, HttpResourceOptions } from './types';

/** 用户表冲突时的扫描顺序：先声明者优先 */
export const BUILTIN_KIND_ORDER: readonly BuiltinHttpResourceKind[] = [
  'image',
  'document',
  'archive',
  'audio',
  'video',
  'webpage'
] as const;

/** 默认扩展名表（无点、小写） */
export const DEFAULT_HTTP_RESOURCE_EXTENSIONS: Record<
  BuiltinHttpResourceKind,
  readonly string[]
> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
  video: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'],
  webpage: ['html', 'htm']
};

/**
 * 把用户传入的扩展名归一成小写无点。
 *
 * @param raw 原始扩展名。
 * @returns 归一结果；无法使用时返回 null。
 */
export function normalizeExtToken(raw: string): string | null {
  const token = raw.trim().replace(/^\./, '').toLowerCase();
  if (!token || token.includes('/') || token.includes('.')) {
    return null;
  }
  return token;
}

/**
 * 合并默认表与用户 overlay，得到 suffix → kind 查找表。
 *
 * @param overlay 用户扩展名。
 * @returns 查找表。
 */
export function buildExtensionLookup(
  overlay?: HttpResourceOptions['extensions']
): Map<string, BuiltinHttpResourceKind> {
  const map = new Map<string, BuiltinHttpResourceKind>();

  for (const kind of BUILTIN_KIND_ORDER) {
    for (const ext of DEFAULT_HTTP_RESOURCE_EXTENSIONS[kind]) {
      map.set(ext, kind);
    }
  }

  const seenUser = new Map<string, BuiltinHttpResourceKind>();
  for (const kind of BUILTIN_KIND_ORDER) {
    for (const raw of overlay?.[kind] ?? []) {
      const ext = normalizeExtToken(raw);
      if (!ext) continue;
      const existing = seenUser.get(ext);
      if (existing && existing !== kind) {
        console.warn(
          `[remark-http-resource] extension ".${ext}" is mapped to both "${existing}" and "${kind}"; keeping "${existing}"`
        );
        continue;
      }
      seenUser.set(ext, kind);
      map.set(ext, kind);
    }
  }

  return map;
}
