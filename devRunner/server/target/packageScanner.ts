import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getPackagesDir, getRepoRoot, getStateDir } from '../config/paths.js';
import type { PackageSource, PackageTarget, TargetInfo } from '../types.js';
import { displayPath, normalizePathId } from './pathUtils.js';

/** 工作区扫描缓存 TTL（毫秒） */
const WORKSPACE_CACHE_TTL_MS = 3000;

/** 外部工程列表文件 */
function getExternalStateFile(): string {
  return path.join(getStateDir(), '.external-packages.json');
}

let workspaceCache: { at: number; list: PackageTarget[] } | null = null;

/**
 * 判断路径是否存在
 * @param filePath 路径
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 使工作区包列表缓存失效（添加/移除外部工程、切换目标后调用）
 */
export function invalidatePackageCache(): void {
  workspaceCache = null;
}

/**
 * PackageTarget → TargetInfo
 * @param t 目标
 */
export function toTargetInfo(t: PackageTarget): TargetInfo {
  return {
    id: t.id,
    dir: t.dir,
    relativePath: t.relativePath,
    name: t.name,
    absolutePath: t.absolutePath,
    source: t.source
  };
}

/**
 * 从路径构建目标描述（异步读 package.json）
 * @param inputPath 路径
 * @param source 来源
 * @param label 可选别名
 */
export async function buildTargetFromPath(
  inputPath: string,
  source: PackageSource,
  label?: string
): Promise<PackageTarget> {
  const abs = path.resolve(inputPath.trim());
  const pkgPath = path.join(abs, 'package.json');
  if (!(await pathExists(pkgPath))) {
    const err = new Error(`目录不存在或缺少 package.json: ${abs}`);
    (err as Error & { statusCode: number }).statusCode = 404;
    throw err;
  }

  let pkgName = path.basename(abs);
  let description = '';
  let scriptNames: string[] = [];
  try {
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as {
      name?: string;
      description?: string;
      scripts?: Record<string, string>;
    };
    pkgName = pkg.name || pkgName;
    description = pkg.description || '';
    scriptNames = Object.keys(pkg.scripts || {});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const error = new Error(`无法读取 package.json: ${message}`);
    (error as Error & { statusCode: number }).statusCode = 400;
    throw error;
  }

  const packagesDir = getPackagesDir();
  const absId = normalizePathId(abs);
  const rootId = normalizePathId(getRepoRoot());
  const packagesId = normalizePathId(packagesDir);
  const inferredSource: PackageSource =
    source === 'workspace' ||
    absId === rootId ||
    absId.startsWith(`${packagesId}/`)
      ? 'workspace'
      : 'external';

  return {
    id: normalizePathId(abs),
    dir: (label || path.basename(abs)).trim() || path.basename(abs),
    relativePath: displayPath(abs),
    absolutePath: abs,
    name: pkgName,
    description,
    scriptNames,
    source: inferredSource
  };
}

/**
 * 扫描仓库根 + packages（带短时缓存）
 * @param force 强制刷新
 */
export async function scanWorkspacePackages(
  force = false
): Promise<PackageTarget[]> {
  const now = Date.now();
  if (
    !force &&
    workspaceCache &&
    now - workspaceCache.at < WORKSPACE_CACHE_TTL_MS
  ) {
    return workspaceCache.list.map((p) => ({ ...p }));
  }

  const result: PackageTarget[] = [];
  const seen = new Set<string>();
  const packagesDir = getPackagesDir();

  /**
   * 加入一个工作区目标，路径重复则跳过
   * @param inputPath 目录
   * @param label 可选展示名
   */
  async function pushWorkspace(
    inputPath: string,
    label?: string
  ): Promise<void> {
    try {
      const target = await buildTargetFromPath(inputPath, 'workspace', label);
      if (seen.has(target.id)) {
        return;
      }
      seen.add(target.id);
      result.push(target);
    } catch {
      // 忽略无效目录
    }
  }

  await pushWorkspace(getRepoRoot(), path.basename(getRepoRoot()) || 'root');

  if (await pathExists(packagesDir)) {
    const entries = await readdir(packagesDir, { withFileTypes: true });
    const dirs = entries
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b));

    for (const dir of dirs) {
      await pushWorkspace(path.join(packagesDir, dir));
    }
  }

  workspaceCache = { at: now, list: result };
  return result.map((p) => ({ ...p }));
}

/**
 * 读取已保存的外部工程
 */
export async function loadExternalTargets(): Promise<PackageTarget[]> {
  const file = getExternalStateFile();
  if (!(await pathExists(file))) {
    return [];
  }
  try {
    const raw = JSON.parse(await readFile(file, 'utf-8')) as {
      paths?: Array<{ path: string; label?: string }>;
    };
    const list: PackageTarget[] = [];
    for (const item of raw.paths || []) {
      try {
        list.push(
          await buildTargetFromPath(item.path, 'external', item.label)
        );
      } catch {
        // 目录已不存在则跳过
      }
    }
    return list;
  } catch {
    return [];
  }
}

/**
 * 保存外部工程列表
 * @param list 外部目标
 */
export async function saveExternalTargets(
  list: PackageTarget[]
): Promise<void> {
  const paths = list
    .filter((p) => p.source === 'external')
    .map((p) => ({ path: p.absolutePath, label: p.dir }));
  await writeFile(
    getExternalStateFile(),
    JSON.stringify({ paths }, null, 2),
    'utf-8'
  );
  invalidatePackageCache();
}

/**
 * 列出工作区 + 外部工程
 */
export async function listAllPackages(): Promise<PackageTarget[]> {
  const [workspace, external] = await Promise.all([
    scanWorkspacePackages(),
    loadExternalTargets()
  ]);
  return [...workspace, ...external];
}
