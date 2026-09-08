import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfigSync } from './config.js';

loadConfigSync();

/**
 * 当前模块所在目录（可能在 server/config/ 子目录，或打包后的 dist/）
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
 * 是否像 git / 含 package.json 的工程根目录
 * @param dir 待检测目录
 */
function looksLikeWorkspace(dir: string): boolean {
  return (
    existsSync(path.join(dir, '.git')) ||
    existsSync(path.join(dir, 'package.json')) ||
    existsSync(path.join(dir, 'packages'))
  );
}

/**
 * 包根目录：含 package.json(@nnnb/dev-runner) 的目录；打包后为 dist/
 */
export function getPkgRoot(): string {
  let dir = HERE;
  for (let i = 0; i < 8; i++) {
    if (path.basename(dir) === 'dist') {
      if (
        existsSync(path.join(dir, 'index.js')) ||
        existsSync(path.join(dir, 'web'))
      ) {
        return dir;
      }
    }

    const pkgJson = path.join(dir, 'package.json');
    if (existsSync(pkgJson)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgJson, 'utf8')) as {
          name?: string;
        };
        if (pkg.name === '@nnnb/dev-runner') {
          return dir;
        }
      } catch {
        // continue
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  // 回退：假设位于 server/** 下
  if (HERE.replace(/\\/g, '/').includes('/server/')) {
    let walk = HERE;
    while (path.basename(walk) !== 'server' && path.dirname(walk) !== walk) {
      walk = path.dirname(walk);
    }
    if (path.basename(walk) === 'server') {
      return path.resolve(walk, '..');
    }
  }

  return path.resolve(HERE, '..');
}

/**
 * 工作区根目录。优先 `DEV_RUNNER_ROOT`，否则按仓库布局推断，再退回 cwd。
 */
export function getRepoRoot(): string {
  const fromEnv = resolveEnvPath(process.env.DEV_RUNNER_ROOT);
  if (fromEnv) {
    return fromEnv;
  }

  const pkgRoot = getPkgRoot();
  const inferred = path.resolve(pkgRoot, '..');
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
  const pkgRoot = getPkgRoot();
  const besidePkg = path.join(pkgRoot, 'web');
  if (existsSync(besidePkg)) {
    return besidePkg;
  }
  // 打包后 index.js 与 web/ 同级（pkgRoot 即为 dist）
  const besideExe = path.join(HERE, 'web');
  if (existsSync(besideExe)) {
    return besideExe;
  }
  return besidePkg;
}

/**
 * 打印当前解析到的路径，便于排查独立运行配置
 */
export function logResolvedPaths(): void {
  console.log(`[dev-runner] ROOT   = ${getRepoRoot()}`);
  console.log(
    `[dev-runner] WEB    = ${process.env.DEV_RUNNER_WEB?.trim() || '(embedded or ' + getWebDir() + ')'}`
  );
  console.log(`[dev-runner] STATE  = ${getStateDir()}`);
}
