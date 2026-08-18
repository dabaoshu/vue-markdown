import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { killTree } from './killTree.js';
import { listIPv4Addresses } from './listenUrls.js';
import { PipeDecoder } from './logDecode.js';
import { getPackagesDir, getRepoRoot, getStateDir } from './paths.js';
import type {
  PackageSource,
  PackageTarget,
  RunnerEvent,
  RunnerEventListener,
  ScriptRuntime,
  ScriptStatus,
  TargetInfo
} from './types.js';

/** packages 目录 */
const PACKAGES_DIR = getPackagesDir();

/** 当前目标绝对路径 */
const TARGET_STATE_FILE = path.join(getStateDir(), '.target-package');

/** 外部工程列表 */
const EXTERNAL_STATE_FILE = path.join(getStateDir(), '.external-packages.json');

/** 默认目标：仓库根目录 */
const DEFAULT_TARGET_DIR = '.';

/** 日志环形缓冲最大行数 */
const MAX_LOG_LINES = 2000;

/** 匹配 Vite Local / Network 等 http(s) 地址 */
const HTTP_URL_RE =
  /https?:\/\/(?:\[[^\]]+\]|localhost|[\w.-]+|\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?/gi;

/**
 * 单条缓冲日志
 */
interface LogLine {
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
  ts: number;
}

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

  constructor() {
    const initial = resolveInitialTarget();
    this.targetDirAbs = initial.absolutePath;
    this.targetDirName = initial.dir;
    this.targetPkgName = initial.name;
    this.targetSource = initial.source;
    this.loadScriptsFromPackageJson();
  }

  /**
   * 列出仓库根、packages 子包，以及已添加的外部工程
   */
  listPackages(): PackageTarget[] {
    return [...scanWorkspacePackages(), ...loadExternalTargets()];
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
  addExternalPackage(inputPath: string, label?: string): PackageTarget {
    const target = buildTargetFromPath(inputPath, 'external', label);
    const list = loadExternalTargets();
    const exists = list.find((p) => p.id === target.id);
    if (exists) {
      if (label?.trim()) {
        exists.dir = label.trim();
        saveExternalTargets(list);
        return exists;
      }
      return exists;
    }
    list.push(target);
    saveExternalTargets(list);
    return target;
  }

  /**
   * 移除外部工程（不影响本仓库目标）
   * @param inputPath 绝对路径或 id
   */
  async removeExternalPackage(inputPath: string): Promise<PackageTarget[]> {
    let removeId = normalizePathId(inputPath);
    try {
      removeId = buildTargetFromPath(inputPath, 'external').id;
    } catch {
      // 直接按规范化字符串比对
    }

    const next = loadExternalTargets().filter((p) => p.id !== removeId);
    saveExternalTargets(next);

    if (normalizePathId(this.targetDirAbs) === removeId) {
      const fallback = scanWorkspacePackages()[0] || next[0];
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
    const resolved = resolveTargetInput(input);
    const running = this.listScripts().filter((s) => s.status === 'running');
    if (running.length > 0) {
      await this.stopAll();
    }

    this.targetDirAbs = resolved.absolutePath;
    this.targetDirName = resolved.dir;
    this.targetPkgName = resolved.name;
    this.targetSource = resolved.source;
    persistCurrentTarget(resolved.absolutePath);
    this.loadScriptsFromPackageJson();

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
  private loadScriptsFromPackageJson(): void {
    this.slots.clear();
    const pkgPath = path.join(this.targetDirAbs, 'package.json');
    let raw: string;
    try {
      raw = readFileSync(pkgPath, 'utf-8');
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
   * 获取指定脚本的缓冲日志（用于 WS 重连回放）
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
    this.appendLog(
      slot,
      'system',
      `[system] 在 ${this.getTarget().relativePath} 启动 npm run ${name}\n`
    );

    const child = spawnChildScript(name, this.targetDirAbs);

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
    slot.logs.push({ stream, text, ts });
    while (slot.logs.length > MAX_LOG_LINES) {
      slot.logs.shift();
    }
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
    HTTP_URL_RE.lastIndex = 0;
    const found: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = HTTP_URL_RE.exec(text)) !== null) {
      const full = match[0].replace(/\/$/, '');
      const portStr = match[1];
      let port = portStr ? Number(portStr) : full.startsWith('https://') ? 443 : 80;
      if (!Number.isFinite(port) || port < 1) {
        continue;
      }
      if (port < 1024 && port !== 80 && port !== 443) {
        continue;
      }
      found.push(full);
      slot.runtime.port = port;
    }
    if (found.length === 0) {
      return;
    }

    const port = slot.runtime.port;
    const urls = new Set<string>([...(slot.runtime.previewUrls || []), ...found]);
    if (port) {
      const proto = found[0]?.startsWith('https://') ? 'https' : 'http';
      urls.add(`${proto}://localhost:${port}`);
      for (const ip of listIPv4Addresses()) {
        urls.add(`${proto}://${ip}:${port}`);
      }
    }

    const list = [...urls];
    const preferred =
      list.find((u) => u.includes('localhost')) || list[0] || null;
    if (
      slot.runtime.previewUrl === preferred &&
      slot.runtime.previewUrls.length === list.length &&
      list.every((u) => slot.runtime.previewUrls.includes(u))
    ) {
      return;
    }
    slot.runtime.previewUrl = preferred;
    slot.runtime.previewUrls = list;
    this.emit({
      type: 'port',
      script: slot.runtime.name,
      port: port || 0,
      previewUrl: preferred || '',
      previewUrls: list,
      ts: Date.now()
    });
    this.appendLog(
      slot,
      'system',
      `[system] 可访问地址:\n${list.map((u) => `  ${u}`).join('\n')}\n`
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

/**
 * 启动目标包脚本子进程
 * @param name 脚本名
 * @param cwd 工作目录
 */
function spawnChildScript(name: string, cwd: string): ChildProcess {
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

  if (process.platform === 'win32') {
    return spawn(
      'cmd.exe',
      ['/d', '/s', '/c', `chcp 65001>nul && npm run ${name}`],
      {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      }
    );
  }

  return spawn('npm', ['run', name], {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

/**
 * 扫描仓库根 + packages 下含 package.json 的目录
 */
function scanWorkspacePackages(): PackageTarget[] {
  const result: PackageTarget[] = [];
  const seen = new Set<string>();

  /**
   * 加入一个工作区目标，路径重复则跳过
   * @param inputPath 目录
   * @param label 可选展示名
   */
  function pushWorkspace(inputPath: string, label?: string): void {
    try {
      const target = buildTargetFromPath(inputPath, 'workspace', label);
      if (seen.has(target.id)) {
        return;
      }
      seen.add(target.id);
      result.push(target);
    } catch {
      // 忽略无效目录
    }
  }

  pushWorkspace(getRepoRoot(), path.basename(getRepoRoot()) || 'root');

  if (existsSync(PACKAGES_DIR)) {
    const dirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b));

    for (const dir of dirs) {
      pushWorkspace(path.join(PACKAGES_DIR, dir));
    }
  }
  return result;
}

/**
 * 读取已保存的外部工程
 */
function loadExternalTargets(): PackageTarget[] {
  if (!existsSync(EXTERNAL_STATE_FILE)) {
    return [];
  }
  try {
    const raw = JSON.parse(readFileSync(EXTERNAL_STATE_FILE, 'utf-8')) as {
      paths?: Array<{ path: string; label?: string }>;
    };
    const list: PackageTarget[] = [];
    for (const item of raw.paths || []) {
      try {
        list.push(buildTargetFromPath(item.path, 'external', item.label));
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
function saveExternalTargets(list: PackageTarget[]): void {
  const paths = list
    .filter((p) => p.source === 'external')
    .map((p) => ({ path: p.absolutePath, label: p.dir }));
  writeFileSync(
    EXTERNAL_STATE_FILE,
    JSON.stringify({ paths }, null, 2),
    'utf-8'
  );
}

/**
 * 规范化路径 ID（统一分隔符与大小写盘符）
 * @param abs 绝对路径
 */
function normalizePathId(abs: string): string {
  const resolved = path.resolve(abs);
  if (process.platform === 'win32') {
    return resolved.replace(/\\/g, '/').toLowerCase();
  }
  return resolved.replace(/\\/g, '/');
}

/**
 * 展示路径：仓库内用相对路径，外部用绝对路径
 * @param abs 绝对路径
 */
function displayPath(abs: string): string {
  const rel = path.relative(getRepoRoot(), abs);
  if (!rel) {
    return '.';
  }
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
    return rel.replace(/\\/g, '/');
  }
  return path.resolve(abs).replace(/\\/g, '/');
}

/**
 * PackageTarget → TargetInfo
 * @param t 目标
 */
function toTargetInfo(t: PackageTarget): TargetInfo {
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
 * 从路径构建目标描述
 * @param inputPath 路径
 * @param source 来源
 * @param label 可选别名
 */
function buildTargetFromPath(
  inputPath: string,
  source: PackageSource,
  label?: string
): PackageTarget {
  const abs = path.resolve(inputPath.trim());
  const pkgPath = path.join(abs, 'package.json');
  if (!existsSync(pkgPath)) {
    const err = new Error(`目录不存在或缺少 package.json: ${abs}`);
    (err as Error & { statusCode: number }).statusCode = 404;
    throw err;
  }

  let pkgName = path.basename(abs);
  let description = '';
  let scriptNames: string[] = [];
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
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

  const absId = normalizePathId(abs);
  const rootId = normalizePathId(getRepoRoot());
  const packagesId = normalizePathId(PACKAGES_DIR);
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
 * 解析用户输入为目标：`.` / 仓库根 / packages 短名 / 绝对路径 / 已登记外部路径
 * @param input 输入
 */
function resolveTargetInput(input: string): PackageTarget {
  const raw = input.trim();
  if (!raw) {
    const err = new Error('目标路径不能为空');
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }

  // 0) 与下拉列表同一套数据精确匹配（id / 绝对路径 / 短名）
  const listed = [...scanWorkspacePackages(), ...loadExternalTargets()];
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
  if (path.isAbsolute(raw) || /^[A-Za-z]:[\\/]/.test(raw) || raw.startsWith('\\\\')) {
    const target = buildTargetFromPath(raw, 'external');
    // 外部路径自动登记，方便下次下拉可选
    if (target.source === 'external') {
      const list = loadExternalTargets();
      if (!list.some((p) => p.id === target.id)) {
        list.push(target);
        saveExternalTargets(list);
      }
    }
    return target;
  }

  // 2) 已登记外部：按 id / 别名 / 展示路径匹配
  const externals = loadExternalTargets();
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
    const abs = path.resolve(PACKAGES_DIR, dir);
    if (
      normalizePathId(abs).startsWith(normalizePathId(PACKAGES_DIR) + '/') &&
      existsSync(path.join(abs, 'package.json'))
    ) {
      return buildTargetFromPath(abs, 'workspace');
    }
  }

  // 5) 相对仓库根的路径
  const fromRepo = path.resolve(getRepoRoot(), raw);
  if (existsSync(path.join(fromRepo, 'package.json'))) {
    const target = buildTargetFromPath(fromRepo, 'external');
    if (target.source === 'external') {
      const list = loadExternalTargets();
      if (!list.some((p) => p.id === target.id)) {
        list.push(target);
        saveExternalTargets(list);
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
function resolveInitialTarget(): PackageTarget {
  const fromEnv = process.env.DEV_RUNNER_PACKAGE?.trim();
  if (fromEnv) {
    try {
      return resolveTargetInput(fromEnv);
    } catch (err) {
      console.warn('[ProcessManager] DEV_RUNNER_PACKAGE 无效，回退默认', err);
    }
  }

  if (existsSync(TARGET_STATE_FILE)) {
    try {
      const saved = readFileSync(TARGET_STATE_FILE, 'utf-8').trim();
      if (saved) {
        return resolveTargetInput(saved);
      }
    } catch {
      // ignore
    }
  }

  try {
    return resolveTargetInput(DEFAULT_TARGET_DIR);
  } catch {
    const packages = [...scanWorkspacePackages(), ...loadExternalTargets()];
    if (packages.length === 0) {
      throw new Error('没有可用的目标工程（仓库根 / packages 均无 package.json，且未添加外部路径）');
    }
    return packages[0];
  }
}

/**
 * 持久化当前目标绝对路径
 * @param abs 绝对路径
 */
function persistCurrentTarget(abs: string): void {
  try {
    writeFileSync(TARGET_STATE_FILE, path.resolve(abs), 'utf-8');
  } catch (err) {
    console.warn('[ProcessManager] 无法保存目标包选择', err);
  }
}

/**
 * 仓库根路径
 */
export { getRepoRoot } from './paths.js';
