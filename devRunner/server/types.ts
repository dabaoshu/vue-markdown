/**
 * 脚本进程运行状态
 */
export type ScriptStatus = 'idle' | 'running' | 'exited' | 'error';

/**
 * 目标来源：本仓库（根目录或 packages），或外部工程目录
 */
export type PackageSource = 'workspace' | 'external';

/**
 * 可选目标包
 */
export interface PackageTarget {
  /** 稳定 ID（规范化绝对路径） */
  id: string;
  /** 目录名 / 自定义别名 */
  dir: string;
  /** 展示路径 */
  relativePath: string;
  /** 绝对路径 */
  absolutePath: string;
  /** package.json name */
  name: string;
  /** package.json description */
  description: string;
  /** scripts 键名列表 */
  scriptNames: string[];
  /** 来源 */
  source: PackageSource;
}

/**
 * 当前目标包运行时信息
 */
export interface TargetInfo {
  id: string;
  dir: string;
  relativePath: string;
  name: string;
  absolutePath: string;
  source: PackageSource;
}

/**
 * 单个脚本的运行时快照
 */
export interface ScriptRuntime {
  /** 脚本名称，如 dev / build / preview */
  name: string;
  /** 原始命令字符串 */
  command: string;
  /** 当前状态 */
  status: ScriptStatus;
  /** 子进程 PID（未运行时为 null） */
  pid: number | null;
  /** 最近一次退出码 */
  exitCode: number | null;
  /** 从日志解析出的预览 URL（优先 Local） */
  previewUrl: string | null;
  /** 日志里解析到的全部预览地址（localhost + 局域网 IP） */
  previewUrls: string[];
  /** 从日志解析出的端口 */
  port: number | null;
}

/**
 * WebSocket / 广播事件载荷
 */
export type RunnerEvent =
  | {
      type: 'log';
      script: string;
      stream: 'stdout' | 'stderr' | 'system';
      text: string;
      ts: number;
    }
  | {
      type: 'status';
      script: string;
      status: ScriptStatus;
      pid: number | null;
      exitCode: number | null;
      ts: number;
    }
  | {
      type: 'port';
      script: string;
      port: number;
      previewUrl: string;
      previewUrls: string[];
      ts: number;
    }
  | {
      type: 'error';
      script: string | null;
      message: string;
      ts: number;
    }
  | {
      type: 'snapshot';
      scripts: ScriptRuntime[];
      target: TargetInfo;
      ts: number;
    }
  | {
      type: 'target';
      target: TargetInfo;
      scripts: ScriptRuntime[];
      ts: number;
    };

/**
 * 事件订阅回调
 */
export type RunnerEventListener = (event: RunnerEvent) => void;
