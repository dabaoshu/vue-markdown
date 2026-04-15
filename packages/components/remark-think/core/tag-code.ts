import { codes, values } from 'micromark-util-symbol';

/**
 * 获取字符在 micromark 中对应的 code。
 *
 * @param str 单字符字符串。
 * @returns code 值。
 */
export function getStrCode(str: string): number {
  const key = Object.keys(values).find((item) => values[item] === str);
  return (codes as Record<string, number>)[key as string];
}
