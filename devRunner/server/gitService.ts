import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getRepoRoot } from './paths.js';

const execFileAsync = promisify(execFile);

/**
 * Git 分支信息
 */
export interface GitInfo {
  /** 仓库根路径 */
  root: string;
  /** 当前分支名；detached HEAD 时为 null */
  branch: string | null;
  /** 是否 detached HEAD */
  detached: boolean;
  /** 短 commit hash */
  commit: string;
  /** 工作区是否有未提交改动 */
  dirty: boolean;
  /** 本地分支列表 */
  localBranches: string[];
  /** 远程分支列表（origin/xxx，不含 HEAD） */
  remoteBranches: string[];
}

/**
 * 在仓库根执行 git 命令
 * @param args git 参数
 */
async function git(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd: getRepoRoot(),
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024
    });
    return stdout.trim();
  } catch (err) {
    const message =
      err && typeof err === 'object' && 'stderr' in err
        ? String((err as { stderr: string }).stderr || '').trim()
        : err instanceof Error
          ? err.message
          : String(err);
    const error = new Error(message || 'git 命令失败');
    (error as Error & { statusCode: number }).statusCode = 500;
    throw error;
  }
}

/**
 * 校验分支名，防止命令注入
 * @param name 分支名
 */
function assertSafeBranchName(name: string): void {
  // 允许常见分支名与 remote tracking 形式 origin/feature/foo
  if (!/^[A-Za-z0-9._/\-]+$/.test(name) || name.includes('..')) {
    const err = new Error(`非法分支名: ${name}`);
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }
}

/**
 * 获取当前仓库分支信息
 */
export async function getGitInfo(): Promise<GitInfo> {
  const [branchRaw, commit, statusPorcelain, localRaw, remoteRaw] =
    await Promise.all([
      git(['rev-parse', '--abbrev-ref', 'HEAD']),
      git(['rev-parse', '--short', 'HEAD']),
      git(['status', '--porcelain']),
      git(['branch', '--format=%(refname:short)']),
      git(['branch', '-r', '--format=%(refname:short)'])
    ]);

  const detached = branchRaw === 'HEAD';
  const branch = detached ? null : branchRaw;
  const localBranches = localRaw
    ? localRaw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    : [];
  const remoteBranches = remoteRaw
    ? remoteRaw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s && !s.endsWith('/HEAD'))
    : [];

  return {
    root: getRepoRoot(),
    branch,
    detached,
    commit,
    dirty: statusPorcelain.length > 0,
    localBranches,
    remoteBranches
  };
}

/**
 * 切换分支
 * @param target 目标分支（本地名，或 origin/xxx）
 */
export async function checkoutBranch(target: string): Promise<GitInfo> {
  const name = target.trim();
  assertSafeBranchName(name);

  // remote 分支：若本地不存在同名分支则创建 -b 跟踪
  if (name.includes('/')) {
    const short = name.replace(/^[^/]+\//, '');
    assertSafeBranchName(short);
    const locals = (await git(['branch', '--format=%(refname:short)']))
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (locals.includes(short)) {
      await git(['checkout', short]);
    } else {
      await git(['checkout', '-b', short, '--track', name]);
    }
  } else {
    await git(['checkout', name]);
  }

  return getGitInfo();
}

export { getRepoRoot } from './paths.js';
