import type { ThinkFlowOption } from './type';

/**
 * 归一化 think 配置，确保 tags 可用且均为字符串。
 *
 * @param options 原始配置。
 * @returns 归一化后的配置对象。
 */
export function normalizeThinkOptions(
  options?: Partial<ThinkFlowOption>
): ThinkFlowOption {
  const tags = options?.tags ?? ['think'];
  if (!Array.isArray(tags)) {
    throw new Error('tags must be an array of strings');
  }
  if (tags.some((tag) => typeof tag !== 'string')) {
    throw new Error('All tags must be strings');
  }
  return {
    tags,
    customTags: options?.customTags ?? tags
  };
}
