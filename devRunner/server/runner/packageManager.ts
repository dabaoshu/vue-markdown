import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** 支持的包管理器 */
export type PackageManager = 'npm' | 'pnpm' | 'yarn';

/** 配置 / 环境变量模式 */
export type PackageManagerMode = PackageManager | 'auto';

/**
 * 解析 DEV_RUNNER_PM（或显式 mode）
 * @param raw 原始值
 */
export function parsePackageManagerMode(
  raw: string | undefined
): PackageManagerMode {
  const value = (raw || 'auto').trim().toLowerCase();
  switch (value) {
    case 'npm':
    case 'pnpm':
    case 'yarn':
    case 'auto':
      return value;
    default:
      console.warn(
        `[dev-runner] 未知 DEV_RUNNER_PM=${raw}，回退 auto`
      );
      return 'auto';
  }
}

/**
 * 从 package.json 的 packageManager 字段解析
 * @param dir 目录
 */
function fromPackageManagerField(dir: string): PackageManager | null {
  const pkgPath = path.join(dir, 'package.json');
  if (!existsSync(pkgPath)) {
    return null;
  }
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      packageManager?: string;
    };
    const field = pkg.packageManager?.trim().toLowerCase() || '';
    if (field.startsWith('pnpm@') || field === 'pnpm') {
      return 'pnpm';
    }
    if (field.startsWith('yarn@') || field === 'yarn') {
      return 'yarn';
    }
    if (field.startsWith('npm@') || field === 'npm') {
      return 'npm';
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * 根据 lockfile 判断
 * @param dir 目录
 */
function fromLockfile(dir: string): PackageManager | null {
  if (existsSync(path.join(dir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (existsSync(path.join(dir, 'yarn.lock'))) {
    return 'yarn';
  }
  if (existsSync(path.join(dir, 'package-lock.json'))) {
    return 'npm';
  }
  if (existsSync(path.join(dir, 'npm-shrinkwrap.json'))) {
    return 'npm';
  }
  return null;
}

/**
 * 从目录向上查找线索（含自身）
 * @param startDir 起始目录
 * @param stopAt 可选停止目录（含）
 */
function detectFromAncestors(
  startDir: string,
  stopAt?: string
): PackageManager | null {
  let current = path.resolve(startDir);
  const stop = stopAt ? path.resolve(stopAt) : null;
  const seen = new Set<string>();

  while (!seen.has(current)) {
    seen.add(current);

    const fromField = fromPackageManagerField(current);
    if (fromField) {
      return fromField;
    }
    const fromLock = fromLockfile(current);
    if (fromLock) {
      return fromLock;
    }

    if (stop && path.resolve(current) === stop) {
      break;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

/**
 * 检测目标目录应使用的包管理器
 *
 * 优先级：显式 mode / DEV_RUNNER_PM > packageManager 字段 > lockfile（向上查找）> npm
 *
 * @param cwd 目标工程目录
 * @param options.mode 覆盖模式；默认读环境变量
 * @param options.repoRoot 向上查找的停止边界（可选）
 */
export function detectPackageManager(
  cwd: string,
  options?: {
    mode?: PackageManagerMode;
    repoRoot?: string;
  }
): PackageManager {
  const mode =
    options?.mode ??
    parsePackageManagerMode(process.env.DEV_RUNNER_PM);

  if (mode !== 'auto') {
    return mode;
  }

  return detectFromAncestors(cwd, options?.repoRoot) || 'npm';
}

/**
 * 生成 `{pm} run {script}` 命令字符串
 * @param pm 包管理器
 * @param script 脚本名
 */
export function resolveRunCommand(pm: PackageManager, script: string): string {
  return `${pm} run ${script}`;
}
