/**
 * DOM 截图导出格式
 */
export type DomExportFormat = 'pdf' | 'png' | 'jpeg' | 'clipboard';

/**
 * 截图引擎类型
 */
export type CaptureEngine = 'html2canvas';

/**
 * 截图参数
 */
export interface CaptureOptions {
  /** 像素比，默认 2 */
  pixelRatio?: number;
  /** 背景色，默认 #ffffff */
  backgroundColor?: string;
  /** 是否截取完整 scrollHeight，默认 true */
  fullPage?: boolean;
  /** 是否镜像计算样式到 clone，默认 true */
  syncStyles?: boolean;
  /** 指定截图宽度（默认取容器当前可视宽度） */
  width?: number;
  /** 指定截图高度（默认按 fullPage 计算） */
  height?: number;
  /** 截图引擎，默认 html2canvas */
  engine?: CaptureEngine;
}

/**
 * PDF 分页参数
 */
export interface PdfExportOptions {
  /** 页面尺寸，默认 a4 */
  pageSize?: 'a4' | 'letter';
  /** 方向，默认 portrait */
  orientation?: 'portrait' | 'landscape';
  /** 页边距（毫米），默认 10 */
  marginMm?: number;
  /** JPEG 压缩质量 0–1，默认 0.92 */
  imageQuality?: number;
}

/**
 * DOM 导出配置
 */
export interface DomExportOptions {
  /** 要截图的 DOM 节点 */
  target: HTMLElement;
  /** 导出格式 */
  format: DomExportFormat;
  /** 下载文件名（不含扩展名时可自动补全） */
  filename?: string;
  /** 截图参数 */
  capture?: CaptureOptions;
  /** PDF 参数（format=pdf 时生效） */
  pdf?: PdfExportOptions;
  /**
   * 业务侧额外等待逻辑
   */
  waitFor?: () => void | Promise<void>;
  /** 截图前钩子 */
  beforeCapture?: (target: HTMLElement) => void | Promise<void>;
  /** 截图后恢复钩子 */
  afterCapture?: (target: HTMLElement) => void | Promise<void>;
  /** 最大等待毫秒，默认 15000 */
  timeoutMs?: number;
}

/**
 * 导出结果
 */
export interface ExportResult {
  format: DomExportFormat;
  blob?: Blob;
  filename?: string;
}
