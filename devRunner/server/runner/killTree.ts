import { spawn } from 'node:child_process';

/**
 * 杀掉进程树。Windows 用 taskkill /T，其它平台先杀进程组再杀自身。
 * @param pid 根进程 PID
 * @param _signal 信号（Windows 忽略，一律强制结束）
 * @param callback 完成回调
 */
export function killTree(
  pid: number,
  _signal: string,
  callback: (err?: Error) => void
): void {
  if (process.platform === 'win32') {
    const child = spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore'
    });
    child.on('error', (err) => {
      callback(err);
    });
    child.on('close', () => {
      callback();
    });
    return;
  }

  try {
    process.kill(-pid, 'SIGKILL');
    callback();
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
      callback();
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
