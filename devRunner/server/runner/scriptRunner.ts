import { spawn, type ChildProcess } from 'node:child_process';
import { getRepoRoot } from '../config/paths.js';
import {
  detectPackageManager,
  resolveRunCommand,
  type PackageManager
} from './packageManager.js';

/**
 * 启动目标包脚本子进程（按目录自动选择 npm / pnpm / yarn）
 * @param name 脚本名
 * @param cwd 工作目录
 * @returns 子进程与实际使用的包管理器
 */
export function spawnChildScript(
  name: string,
  cwd: string
): { child: ChildProcess; packageManager: PackageManager; command: string } {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    FORCE_COLOR: '1',
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--no-warnings']
      .filter(Boolean)
      .join(' ')
  };
  delete env.NO_COLOR;

  if (!/^[A-Za-z0-9:_-]+$/.test(name)) {
    throw new Error(`非法脚本名: ${name}`);
  }

  const packageManager = detectPackageManager(cwd, {
    repoRoot: getRepoRoot()
  });
  const command = resolveRunCommand(packageManager, name);

  if (process.platform === 'win32') {
    const child = spawn(
      'cmd.exe',
      ['/d', '/s', '/c', `chcp 65001>nul && ${command}`],
      {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      }
    );
    return { child, packageManager, command };
  }

  const child = spawn(packageManager, ['run', name], {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return { child, packageManager, command };
}
