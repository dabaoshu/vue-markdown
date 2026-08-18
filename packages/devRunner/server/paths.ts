import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfigSync } from './config.js';

loadConfigSync();

/**
 * 当前模块所在目录（tsx 下为 server/，打包后为 dist/）
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * 解析环境变量路径（相对路径相对 cwd）
 * @param value 原始值
 */
function resolveEnvPath(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return path.resolve(trimmed);
}

/**
 * 是否像 git / packages 工作区根目录
 * @param dir 待检测目录
 */
function looksLikeWorkspace(dir: string): boolean {
  return existsSync(path.join(dir, '.git')) || existsSync(path.join(dir, 'packages'));
}

/**
 * 包根目录：tsx 的 server/ 上一级；打包后优先用 index.js 所在目录（含 web/）
 */
export function getPkgRoot(): string {
  const base = path.basename(HERE);
  if (base === 'server') {
    return path.resolve(HERE, '..');
  }
  if (base === 'dist') {
    if (existsSync(path.join(HERE, 'index.js')) || existsSync(path.join(HERE, 'web'))) {
      return HERE;
    }
    return path.resolve(HERE, '..');
  }
  return HERE;
}

/**
 * 工作区根目录。优先 `DEV_RUNNER_ROOT`，否则按仓库布局推断，再退回 cwd。
 */
export function getRepoRoot(): string {
  const fromEnv = resolveEnvPath(process.env.DEV_RUNNER_ROOT);
  if (fromEnv) {
    return fromEnv;
  }

  const inferred = path.resolve(HERE, '../../..');
  if (looksLikeWorkspace(inferred)) {
    return inferred;
  }

  const cwd = process.cwd();
  if (looksLikeWorkspace(cwd)) {
    return cwd;
  }

  return cwd;
}

/**
 * packages 目录。可用 `DEV_RUNNER_PACKAGES` 覆盖（绝对路径或相对工作区根）。
 */
export function getPackagesDir(): string {
  const fromEnv = resolveEnvPath(process.env.DEV_RUNNER_PACKAGES);
  if (fromEnv) {
    return fromEnv;
  }
  return path.join(getRepoRoot(), 'packages');
}

/**
 * 状态文件目录（.target-package 等）。可用 `DEV_RUNNER_STATE` 覆盖。
 */
export function getStateDir(): string {
  const fromEnv = resolveEnvPath(process.env.DEV_RUNNER_STATE);
  if (fromEnv) {
    return fromEnv;
  }
  return getPkgRoot();
}

/**
 * 磁盘静态页目录。
 * 优先 `DEV_RUNNER_WEB`，其次可执行文件旁的 web/（打包产物），再回退包内 web/。
 */
export function getWebDir(): string {
  const fromEnv = resolveEnvPath(process.env.DEV_RUNNER_WEB);
  if (fromEnv) {
    return fromEnv;
  }
  const besideExe = path.join(HERE, 'web');
  if (existsSync(besideExe)) {
    return besideExe;
  }
  return path.join(getPkgRoot(), 'web');
}

/**
 * 打印当前解析到的路径，便于排查独立运行配置
 */
export function logResolvedPaths(): void {
  console.log(`[dev-runner] ROOT   = ${getRepoRoot()}`);
  console.log(`[dev-runner] WEB    = ${process.env.DEV_RUNNER_WEB?.trim() || '(embedded or ' + getWebDir() + ')'}`);
  console.log(`[dev-runner] STATE  = ${getStateDir()}`);
}
