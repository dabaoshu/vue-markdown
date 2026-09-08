import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getPackagesDir, getRepoRoot, getStateDir } from '../config/paths.js';
import type { PackageTarget } from '../types.js';
import {
  buildTargetFromPath,
  invalidatePackageCache,
  loadExternalTargets,
  saveExternalTargets,
  scanWorkspacePackages
} from './packageScanner.js';
import { normalizePathId } from './pathUtils.js';

/** 默认目标：仓库根目录 */
export const DEFAULT_TARGET_DIR = '.';

/** 当前目标状态文件 */
function getTargetStateFile(): string {
  return path.join(getStateDir(), '.target-package');
}

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
 * 解析用户输入为目标：`.` / 仓库根 / packages 短名 / 绝对路径 / 已登记外部路径
 * @param input 输入
 */
export async function resolveTargetInput(input: string): Promise<PackageTarget> {
  const raw = input.trim();
  if (!raw) {
    const err = new Error('目标路径不能为空');
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }

  const packagesDir = getPackagesDir();

  // 0) 与下拉列表同一套数据精确匹配（id / 绝对路径 / 短名）
  const listed = [
    ...(await scanWorkspacePackages()),
    ...(await loadExternalTargets())
  ];
  const rawNorm = normalizePathId(raw);
  const rawSlash = raw.replace(/\\/g, '/');
  const listedHit = listed.find(
    (p) =>
      p.id === raw ||
      p.id === rawNorm ||
      p.absolutePath === raw ||
      normalizePathId(p.absolutePath) === rawNorm ||
      p.dir === raw ||
      p.relativePath === rawSlash ||
      p.relativePath === `packages/${raw}`
  );
  if (listedHit) {
    return buildTargetFromPath(listedHit.absolutePath, listedHit.source);
  }

  // 1) 绝对路径或明显的外部路径
  if (
    path.isAbsolute(raw) ||
    /^[A-Za-z]:[\\/]/.test(raw) ||
    raw.startsWith('\\\\')
  ) {
    const target = await buildTargetFromPath(raw, 'external');
    if (target.source === 'external') {
      const list = await loadExternalTargets();
      if (!list.some((p) => p.id === target.id)) {
        list.push(target);
        await saveExternalTargets(list);
      }
    }
    return target;
  }

  // 2) 已登记外部：按 id / 别名 / 展示路径匹配
  const externals = await loadExternalTargets();
  const byExternal = externals.find(
    (p) =>
      p.id === normalizePathId(raw) ||
      p.dir === raw ||
      p.relativePath === raw.replace(/\\/g, '/') ||
      p.absolutePath === raw
  );
  if (byExternal) {
    return byExternal;
  }

  // 3) 仓库根（. / ./ ）
  if (raw === '.' || raw === './' || raw.replace(/\\/g, '/') === '.') {
    return buildTargetFromPath(getRepoRoot(), 'workspace');
  }

  // 4) 本仓库 packages 短名或 packages/xxx
  let dir = raw.replace(/\\/g, '/');
  if (dir.startsWith('packages/')) {
    dir = dir.slice('packages/'.length);
  }
  dir = dir.replace(/^\/+|\/+$/g, '').split('/')[0];
  if (dir && dir !== '.' && /^[A-Za-z0-9._-]+$/.test(dir)) {
    const abs = path.resolve(packagesDir, dir);
    if (
      normalizePathId(abs).startsWith(normalizePathId(packagesDir) + '/') &&
      (await pathExists(path.join(abs, 'package.json')))
    ) {
      return buildTargetFromPath(abs, 'workspace');
    }
  }

  // 5) 相对仓库根的路径
  const fromRepo = path.resolve(getRepoRoot(), raw);
  if (await pathExists(path.join(fromRepo, 'package.json'))) {
    const target = await buildTargetFromPath(fromRepo, 'external');
    if (target.source === 'external') {
      const list = await loadExternalTargets();
      if (!list.some((p) => p.id === target.id)) {
        list.push(target);
        await saveExternalTargets(list);
      }
    }
    return target;
  }

  const err = new Error(`未找到目标工程: ${raw}`);
  (err as Error & { statusCode: number }).statusCode = 404;
  throw err;
}

/**
 * 启动时解析初始目标
 */
export async function resolveInitialTarget(): Promise<PackageTarget> {
  const fromEnv = process.env.DEV_RUNNER_PACKAGE?.trim();
  if (fromEnv) {
    try {
      return await resolveTargetInput(fromEnv);
    } catch (err) {
      console.warn('[ProcessManager] DEV_RUNNER_PACKAGE 无效，回退默认', err);
    }
  }

  const stateFile = getTargetStateFile();
  if (await pathExists(stateFile)) {
    try {
      const saved = (await readFile(stateFile, 'utf-8')).trim();
      if (saved) {
        return await resolveTargetInput(saved);
      }
    } catch {
      // ignore
    }
  }

  try {
    return await resolveTargetInput(DEFAULT_TARGET_DIR);
  } catch {
    const packages = [
      ...(await scanWorkspacePackages()),
      ...(await loadExternalTargets())
    ];
    if (packages.length === 0) {
      throw new Error(
        '没有可用的目标工程（仓库根 / packages 均无 package.json，且未添加外部路径）'
      );
    }
    return packages[0];
  }
}

/**
 * 持久化当前目标绝对路径
 * @param abs 绝对路径
 */
export async function persistCurrentTarget(abs: string): Promise<void> {
  try {
    await writeFile(getTargetStateFile(), path.resolve(abs), 'utf-8');
    invalidatePackageCache();
  } catch (err) {
    console.warn('[ProcessManager] 无法保存目标包选择', err);
  }
}
