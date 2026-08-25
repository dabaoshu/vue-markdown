import path from 'node:path';
import { getRepoRoot } from '../config/paths.js';

/**
 * 规范化路径 ID（统一分隔符与大小写盘符）
 * @param abs 绝对路径
 */
export function normalizePathId(abs: string): string {
  const resolved = path.resolve(abs);
  if (process.platform === 'win32') {
    return resolved.replace(/\\/g, '/').toLowerCase();
  }
  return resolved.replace(/\\/g, '/');
}

/**
 * 展示路径：仓库根为 `.`，仓库内用相对路径，外部用绝对路径
 * @param abs 绝对路径
 * @param repoRoot 可选仓库根（默认 getRepoRoot）
 */
export function displayPath(abs: string, repoRoot: string = getRepoRoot()): string {
  const rel = path.relative(repoRoot, abs);
  if (!rel) {
    return '.';
  }
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
    return rel.replace(/\\/g, '/');
  }
  return path.resolve(abs).replace(/\\/g, '/');
}
