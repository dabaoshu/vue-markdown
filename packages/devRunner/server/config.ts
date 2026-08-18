import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

let loaded = false;

/**
 * 可写在 dev-runner.config.js 里的配置
 */
export interface RunnerConfig {
  /** 工作区 / git 根目录 */
  root?: string;
  /** 控制台端口 */
  port?: number | string;
  /** 启动目标包（目录名或绝对路径） */
  package?: string;
  /** 前端静态目录（覆盖内嵌页面） */
  web?: string;
  /** packages 目录 */
  packages?: string;
  /** 状态文件目录 */
  state?: string;
}

const ENV_KEYS = [
  'DEV_RUNNER_ROOT',
  'DEV_RUNNER_PORT',
  'DEV_RUNNER_PACKAGE',
  'DEV_RUNNER_WEB',
  'DEV_RUNNER_PACKAGES',
  'DEV_RUNNER_STATE',
  'DEV_RUNNER_CONFIG'
] as const;

const JS_TO_ENV: Record<string, (typeof ENV_KEYS)[number]> = {
  root: 'DEV_RUNNER_ROOT',
  ROOT: 'DEV_RUNNER_ROOT',
  port: 'DEV_RUNNER_PORT',
  PORT: 'DEV_RUNNER_PORT',
  package: 'DEV_RUNNER_PACKAGE',
  PACKAGE: 'DEV_RUNNER_PACKAGE',
  web: 'DEV_RUNNER_WEB',
  WEB: 'DEV_RUNNER_WEB',
  packages: 'DEV_RUNNER_PACKAGES',
  PACKAGES: 'DEV_RUNNER_PACKAGES',
  state: 'DEV_RUNNER_STATE',
  STATE: 'DEV_RUNNER_STATE'
};

/**
 * 包根：server/ 或 dist/ 的上一级；独立拷贝的 index.js 则为其所在目录
 */
function getSearchRoots(): string[] {
  const cwd = process.cwd();
  const base = path.basename(HERE);
  const pkgRoot =
    base === 'server' || base === 'dist' ? path.resolve(HERE, '..') : HERE;
  const dirs = [cwd, HERE, pkgRoot];
  return [...new Set(dirs.map((d) => path.resolve(d)))];
}

/**
 * 写入 process.env；已存在的系统环境变量不覆盖
 * @param key 变量名
 * @param value 值
 */
function setIfEmpty(key: string, value: string | number | undefined): void {
  if (value === undefined || value === null) {
    return;
  }
  const text = String(value).trim();
  if (!text) {
    return;
  }
  if (process.env[key] !== undefined && process.env[key] !== '') {
    return;
  }
  process.env[key] = text;
}

/**
 * 解析 .env 文本
 * @param content 文件内容
 */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/**
 * 用 Function 执行 CJS / `export default` 形式的 JS 配置
 * @param filePath 配置文件
 */
function evalJsConfig(filePath: string): RunnerConfig {
  const raw = readFileSync(filePath, 'utf8');
  const code = raw.replace(/export\s+default\s+/, 'module.exports = ');
  const moduleRef = { exports: {} as RunnerConfig | { default?: RunnerConfig } };
  const fn = new Function(
    'module',
    'exports',
    'require',
    '__dirname',
    '__filename',
    'process',
    code
  );
  const dir = path.dirname(filePath);
  fn(
    moduleRef,
    moduleRef.exports,
    (id: string) => {
      throw new Error(`配置文件不允许 require('${id}')`);
    },
    dir,
    filePath,
    process
  );
  const exported = moduleRef.exports;
  if (exported && typeof exported === 'object' && 'default' in exported) {
    return (exported.default || {}) as RunnerConfig;
  }
  return (exported || {}) as RunnerConfig;
}

/**
 * 加载单个配置文件到对象（不写 process.env）
 * @param filePath 路径
 */
function readConfigFile(filePath: string): Record<string, string> {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath);
  try {
    if (ext === '.env' || base === '.env') {
      console.log(`[dev-runner] 已加载配置: ${filePath}`);
      return parseEnvFile(readFileSync(filePath, 'utf8'));
    }
    if (ext === '.js' || ext === '.cjs' || ext === '.mjs') {
      const mapped: Record<string, string> = {};
      const config = evalJsConfig(filePath);
      for (const [key, value] of Object.entries(config)) {
        if (value === undefined || value === null || String(value).trim() === '') {
          continue;
        }
        if (ENV_KEYS.includes(key as (typeof ENV_KEYS)[number])) {
          mapped[key] = String(value);
          continue;
        }
        const envKey = JS_TO_ENV[key];
        if (envKey) {
          mapped[envKey] = String(value);
        }
      }
      console.log(`[dev-runner] 已加载配置: ${filePath}`);
      return mapped;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[dev-runner] 读取配置失败 ${filePath}: ${message}`);
  }
  return {};
}

/**
 * 启动时同步加载 .env / JS 配置。系统环境变量优先，文件只填空缺。
 *
 * 查找顺序：
 * 1. `DEV_RUNNER_CONFIG` 指定的文件
 * 2. cwd、可执行文件旁、包根下的 `dev-runner.config.js` / `.cjs` / `.mjs`
 * 3. 同上目录的 `.env`
 *
 * 文件之间：JS 覆盖 `.env`；两者都不覆盖已有系统环境变量。
 */
export function loadConfigSync(): void {
  if (loaded) {
    return;
  }
  loaded = true;

  /** @type {Record<string, string>} */
  let fromFiles: Record<string, string> = {};

  const explicit = process.env.DEV_RUNNER_CONFIG?.trim();
  if (explicit) {
    const resolved = path.resolve(explicit);
    if (existsSync(resolved)) {
      fromFiles = readConfigFile(resolved);
    } else {
      console.warn(`[dev-runner] DEV_RUNNER_CONFIG 不存在: ${resolved}`);
    }
  } else {
    const jsNames = [
      'dev-runner.config.js',
      'dev-runner.config.cjs',
      'dev-runner.config.mjs'
    ];
    let envFile = '';
    let jsFile = '';
    for (const dir of getSearchRoots()) {
      if (!envFile) {
        const candidate = path.join(dir, '.env');
        if (existsSync(candidate)) {
          envFile = candidate;
        }
      }
      if (!jsFile) {
        for (const name of jsNames) {
          const candidate = path.join(dir, name);
          if (existsSync(candidate)) {
            jsFile = candidate;
            break;
          }
        }
      }
    }
    if (envFile) {
      fromFiles = { ...fromFiles, ...readConfigFile(envFile) };
    }
    if (jsFile) {
      fromFiles = { ...fromFiles, ...readConfigFile(jsFile) };
    }
  }

  for (const [key, value] of Object.entries(fromFiles)) {
    setIfEmpty(key, value);
  }
}
