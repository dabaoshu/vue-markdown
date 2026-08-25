import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { listIPv4Addresses } from '../http/listenUrls.js';
import { MAX_LOG_LINES, pushLogLine, type LogLine } from '../log/logBuffer.js';
import { PipeDecoder } from '../log/logDecode.js';
import {
  collectHttpUrlsFromLog,
  mergePreviewUrls
} from '../log/previewUrls.js';
import {
  buildTargetFromPath,
  invalidatePackageCache,
  listAllPackages,
  loadExternalTargets,
  saveExternalTargets,
  scanWorkspacePackages,
  toTargetInfo
} from '../target/packageScanner.js';
import { displayPath, normalizePathId } from '../target/pathUtils.js';
import {
  persistCurrentTarget,
  resolveInitialTarget,
  resolveTargetInput
} from '../target/targetResolver.js';
import type {
  PackageSource,
  PackageTarget,
  RunnerEvent,
  RunnerEventListener,
  ScriptRuntime,
  ScriptStatus,
  TargetInfo
} from '../types.js';
import { killTree } from './killTree.js';
import { spawnChildScript } from './scriptRunner.js';

/**
 * 内部进程槽位
 */
interface ProcessSlot {
  runtime: ScriptRuntime;
  child: ChildProcess | null;
  logs: LogLine[];
  /** 是否由用户主动 stop（用于区分强制退出与真实错误） */
  stopping: boolean;
}

/**
 * 管理可切换目标包的 npm scripts：启停、日志缓冲、端口解析
 */
export class ProcessManager {
  private readonly slots = new Map<string, ProcessSlot>();
  private readonly listeners = new Set<RunnerEventListener>();
  /** 当前目标包绝对路径 */
  private targetDirAbs: string;
  /** 展示用目录名 / 别名 */
  private targetDirName: string;
  /** 当前 package.json name */
  private targetPkgName: string;
  /** 目标来源 */
  private targetSource: PackageSource;

  private constructor(initial: PackageTarget) {
    this.targetDirAbs = initial.absolutePath;
    this.targetDirName = initial.dir;
    this.targetPkgName = initial.name;
    this.targetSource = initial.source;
  }

  /**
   * 异步创建并加载初始目标 scripts
   */
  static async create(): Promise<ProcessManager> {
    const initial = await resolveInitialTarget();
    const manager = new ProcessManager(initial);
    await manager.loadScriptsFromPackageJson();
    return manager;
  }

  /**
   * 列出仓库根、packages 子包，以及已添加的外部工程
   */
  async listPackages(): Promise<PackageTarget[]> {
    return listAllPackages();
  }

  /**
   * 当前目标包信息
   */
  getTarget(): TargetInfo {
    return toTargetInfo({
      id: normalizePathId(this.targetDirAbs),
      dir: this.targetDirName,
      relativePath: displayPath(this.targetDirAbs),
      absolutePath: this.targetDirAbs,
      name: this.targetPkgName,
      description: '',
      scriptNames: this.listScripts().map((s) => s.name),
      source: this.targetSource
    });
  }

  /**
   * 添加外部工程目录（任意含 package.json 的本机路径）
   * @param inputPath 绝对或相对路径
   * @param label 可选别名
   */
  async addExternalPackage(
    inputPath: string,
    label?: string
  ): Promise<PackageTarget> {
    const target = await buildTargetFromPath(inputPath, 'external', label);
    const list = await loadExternalTargets();
    const exists = list.find((p) => p.id === target.id);
    if (exists) {
      if (label?.trim()) {
        exists.dir = label.trim();
        await saveExternalTargets(list);
        return exists;
      }
      return exists;
    }
    list.push(target);
    await saveExternalTargets(list);
    return target;
  }

  /**
   * 移除外部工程（不影响本仓库目标）
   * @param inputPath 绝对路径或 id
   */
  async removeExternalPackage(inputPath: string): Promise<PackageTarget[]> {
    let removeId = normalizePathId(inputPath);
    try {
      removeId = (await buildTargetFromPath(inputPath, 'external')).id;
    } catch {
      // 直接按规范化字符串比对
    }

    const next = (await loadExternalTargets()).filter(
      (p) => p.id !== removeId
    );
    await saveExternalTargets(next);

    if (normalizePathId(this.targetDirAbs) === removeId) {
      const fallback = (await scanWorkspacePackages())[0] || next[0];
      if (fallback) {
        await this.setTarget(fallback.absolutePath);
      }
    }
    return this.listPackages();
  }

  /**
   * 切换目标目录（仓库根、packages 短名、或任意绝对路径）
   * @param input 目录名 / 相对路径 / 绝对路径
   */
  async setTarget(input: string): Promise<{
    target: TargetInfo;
    scripts: ScriptRuntime[];
    stoppedScripts: string[];
  }> {
    const resolved = await resolveTargetInput(input);
    const running = this.listScripts().filter((s) => s.status === 'running');
    if (running.length > 0) {
      await this.stopAll();
    }

    this.targetDirAbs = resolved.absolutePath;
    this.targetDirName = resolved.dir;
    this.targetPkgName = resolved.name;
    this.targetSource = resolved.source;
    await persistCurrentTarget(resolved.absolutePath);
    invalidatePackageCache();
    await this.loadScriptsFromPackageJson();

    const target = this.getTarget();
    const scripts = this.listScripts();
    this.emit({
      type: 'target',
      target,
      scripts,
      ts: Date.now()
    });
    this.emit({
      type: 'snapshot',
      scripts,
      target,
      ts: Date.now()
    });

    return {
      target,
      scripts,
      stoppedScripts: running.map((s) => s.name)
    };
  }

  /**
   * 从当前目标包 package.json 加载 scripts 列表
   */
  private async loadScriptsFromPackageJson(): Promise<void> {
    this.slots.clear();
    const pkgPath = path.join(this.targetDirAbs, 'package.json');
    let raw: string;
    try {
      raw = await readFile(pkgPath, 'utf-8');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '无法读取 package.json';
      console.error('[ProcessManager]', message);
      throw new Error(`读取 package.json 失败: ${message}`);
    }

    const pkg = JSON.parse(raw) as {
      name?: string;
      scripts?: Record<string, string>;
    };
    this.targetPkgName = pkg.name || this.targetDirName;
    const scripts = pkg.scripts ?? {};

    for (const [name, command] of Object.entries(scripts)) {
      this.slots.set(name, {
        child: null,
        logs: [],
        stopping: false,
        runtime: {
          name,
          command,
          status: 'idle',
          pid: null,
          exitCode: null,
          previewUrl: null,
          previewUrls: [],
          port: null
        }
      });
    }
  }

  /**
   * 订阅事件
   * @param listener 回调
   * @returns 取消订阅函数
   */
  subscribe(listener: RunnerEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 广播事件到所有订阅者
   * @param event 事件
   */
  private emit(event: RunnerEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[ProcessManager] listener error', err);
      }
    }
  }

  /**
   * 返回所有脚本运行时快照
   */
  listScripts(): ScriptRuntime[] {
    return Array.from(this.slots.values()).map((slot) => ({
      ...slot.runtime
    }));
  }

  /**
   * 获取指定脚本的缓冲日志（按需拉取，避免 WS 重连全量回放）
   * @param name 脚本名
   */
  getLogs(name: string): LogLine[] {
    const slot = this.slots.get(name);
    return slot ? [...slot.logs] : [];
  }

  /**
   * 清空指定脚本的服务端日志缓冲，并广播 system 提示
   * @param name 脚本名
   */
  clearLogs(name: string): void {
    const slot = this.requireSlot(name);
    slot.logs = [];
    this.appendLog(slot, 'system', `[system] 日志已清空\n`);
  }

  /**
   * 启动脚本
   * @param name 脚本名
   */
  async start(name: string): Promise<ScriptRuntime> {
    const slot = this.requireSlot(name);
    if (slot.runtime.status === 'running' && slot.child) {
      const err = new Error(`脚本 ${name} 已在运行`);
      (err as Error & { statusCode: number }).statusCode = 409;
      throw err;
    }

    slot.runtime.exitCode = null;
    slot.runtime.previewUrl = null;
    slot.runtime.previewUrls = [];
    slot.runtime.port = null;
    slot.stopping = false;
    this.setStatus(slot, 'running', null, null);

    const { child, command: runCommand } = spawnChildScript(
      name,
      this.targetDirAbs
    );
    this.appendLog(
      slot,
      'system',
      `[system] 在 ${this.getTarget().relativePath} 启动 ${runCommand}\n`
    );

    slot.child = child;
    slot.runtime.pid = child.pid ?? null;
    this.emit({
      type: 'status',
      script: name,
      status: 'running',
      pid: slot.runtime.pid,
      exitCode: null,
      ts: Date.now()
    });

    const stdoutDec = new PipeDecoder();
    const stderrDec = new PipeDecoder();

    /**
     * 解码并写入日志
     * @param stream 流类型
     * @param decoder 流式解码器
     * @param chunk 原始字节
     */
    const onChunk = (
      stream: 'stdout' | 'stderr',
      decoder: PipeDecoder,
      chunk: Buffer
    ): void => {
      const text = decoder.write(chunk);
      if (!text) {
        return;
      }
      this.appendLog(slot, stream, text);
      this.tryParsePort(slot, text);
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      onChunk('stdout', stdoutDec, chunk);
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      onChunk('stderr', stderrDec, chunk);
    });

    child.on('error', (err) => {
      this.appendLog(slot, 'system', `[system] 进程错误: ${err.message}\n`);
      slot.child = null;
      slot.runtime.pid = null;
      this.setStatus(slot, 'error', null, null);
    });

    child.on('close', (code) => {
      const tailOut = stdoutDec.end();
      const tailErr = stderrDec.end();
      if (tailOut) {
        this.appendLog(slot, 'stdout', tailOut);
        this.tryParsePort(slot, tailOut);
      }
      if (tailErr) {
        this.appendLog(slot, 'stderr', tailErr);
        this.tryParsePort(slot, tailErr);
      }

      const exitCode = code ?? (slot.stopping ? 0 : 1);
      const wasStopping = slot.stopping;
      slot.child = null;
      slot.runtime.pid = null;
      slot.runtime.exitCode = exitCode;
      slot.stopping = false;
      const nextStatus: ScriptStatus =
        wasStopping || exitCode === 0 ? 'exited' : 'error';
      this.appendLog(
        slot,
        'system',
        `[system] 进程退出，exitCode=${exitCode}\n`
      );
      this.setStatus(slot, nextStatus, null, exitCode);
    });

    return { ...slot.runtime };
  }

  /**
   * 停止脚本
   * @param name 脚本名
   */
  async stop(name: string): Promise<ScriptRuntime> {
    const slot = this.requireSlot(name);
    if (!slot.child || slot.runtime.status !== 'running') {
      return { ...slot.runtime };
    }

    const pid = slot.child.pid;
    slot.stopping = true;
    this.appendLog(slot, 'system', `[system] 正在停止进程 pid=${pid}\n`);

    await new Promise<void>((resolve) => {
      if (!pid) {
        resolve();
        return;
      }
      killTree(pid, 'SIGTERM', (err) => {
        if (err) {
          console.warn('[ProcessManager] 停止进程警告:', err.message);
        }
        resolve();
      });
    });

    await sleep(500);
    if (slot.child?.pid) {
      await new Promise<void>((resolve) => {
        killTree(slot.child!.pid!, 'SIGKILL', () => resolve());
      });
    }

    return { ...slot.runtime };
  }

  /**
   * 重启脚本：先停后启
   * @param name 脚本名
   */
  async restart(name: string): Promise<ScriptRuntime> {
    await this.stop(name);
    await sleep(300);
    return this.start(name);
  }

  /**
   * 停止所有正在运行的子进程（服务退出时调用）
   */
  async stopAll(): Promise<void> {
    const running = Array.from(this.slots.values()).filter(
      (s) => s.runtime.status === 'running' && s.child
    );
    await Promise.all(running.map((s) => this.stop(s.runtime.name)));
  }

  /**
   * 获取槽位，不存在则抛错
   * @param name 脚本名
   */
  private requireSlot(name: string): ProcessSlot {
    const slot = this.slots.get(name);
    if (!slot) {
      const err = new Error(`未知脚本: ${name}`);
      (err as Error & { statusCode: number }).statusCode = 404;
      throw err;
    }
    return slot;
  }

  /**
   * 更新状态并广播
   */
  private setStatus(
    slot: ProcessSlot,
    status: ScriptStatus,
    pid: number | null,
    exitCode: number | null
  ): void {
    slot.runtime.status = status;
    if (pid !== undefined) {
      slot.runtime.pid = pid;
    }
    if (exitCode !== undefined) {
      slot.runtime.exitCode = exitCode;
    }
    this.emit({
      type: 'status',
      script: slot.runtime.name,
      status,
      pid: slot.runtime.pid,
      exitCode: slot.runtime.exitCode,
      ts: Date.now()
    });
  }

  /**
   * 追加日志到环形缓冲并广播
   */
  private appendLog(
    slot: ProcessSlot,
    stream: LogLine['stream'],
    text: string
  ): void {
    const ts = Date.now();
    pushLogLine(slot.logs, { stream, text, ts }, MAX_LOG_LINES);
    this.emit({
      type: 'log',
      script: slot.runtime.name,
      stream,
      text,
      ts
    });
  }

  /**
   * 从日志文本中解析全部 http(s) 地址，并补全本机所有 IPv4
   */
  private tryParsePort(slot: ProcessSlot, text: string): void {
    const { urls: found, port: foundPort } = collectHttpUrlsFromLog(text);
    if (found.length === 0) {
      return;
    }

    if (foundPort) {
      slot.runtime.port = foundPort;
    }

    const merged = mergePreviewUrls(
      slot.runtime.previewUrls || [],
      found,
      slot.runtime.port,
      listIPv4Addresses()
    );

    if (
      slot.runtime.previewUrl === merged.previewUrl &&
      slot.runtime.previewUrls.length === merged.previewUrls.length &&
      merged.previewUrls.every((u) => slot.runtime.previewUrls.includes(u))
    ) {
      return;
    }

    slot.runtime.previewUrl = merged.previewUrl;
    slot.runtime.previewUrls = merged.previewUrls;
    slot.runtime.port = merged.port;

    this.emit({
      type: 'port',
      script: slot.runtime.name,
      port: merged.port || 0,
      previewUrl: merged.previewUrl || '',
      previewUrls: merged.previewUrls,
      ts: Date.now()
    });
    this.appendLog(
      slot,
      'system',
      `[system] 可访问地址:\n${merged.previewUrls.map((u) => `  ${u}`).join('\n')}\n`
    );
  }
}

/**
 * 简单延时
 * @param ms 毫秒
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { getRepoRoot } from '../config/paths.js';
