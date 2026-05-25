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
 * PDF 分页模式
 */
export type PdfPaginationMode = 'paginated' | 'single';

/**
 * 预设页面尺寸
 */
export type PdfPageSizePreset = 'a4' | 'letter';

/**
 * PDF 页边距（毫米）
 */
export interface PdfMarginOptions {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/**
 * PDF 分页参数
 */
export interface PdfExportOptions {
  /**
   * 分页模式
   * - paginated：按页高切分（默认）
   * - single：整页缩放至单张 PDF
   */
  mode?: PdfPaginationMode;
  /** 页面尺寸，默认 a4；custom 时需配合 customPageSize */
  pageSize?: PdfPageSizePreset | 'custom';
  /** 自定义页面尺寸（毫米） */
  customPageSize?: { widthMm: number; heightMm: number };
  /** 方向，默认 portrait */
  orientation?: 'portrait' | 'landscape';
  /** 统一页边距（毫米），默认 10；可被 margins 分项覆盖 */
  marginMm?: number;
  /** 分项页边距（毫米） */
  margins?: PdfMarginOptions;
  /** JPEG 压缩质量 0–1，默认 0.92 */
  imageQuality?: number;
  /**
   * 是否启用智能分页（沿 DOM 块边界切分，避免拦腰切断文字/图表）
   * 默认 true
   */
  smartBreak?: boolean;
}

/**
 * 规范化后的 PDF 分页配置
 */
export interface ResolvedPdfExportOptions {
  mode: PdfPaginationMode;
  pageSize: PdfPageSizePreset | 'custom';
  orientation: 'portrait' | 'landscape';
  pageWidthMm: number;
  pageHeightMm: number;
  margins: Required<PdfMarginOptions>;
  imageQuality: number;
  customPageSize?: { widthMm: number; heightMm: number };
  smartBreak: boolean;
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

/**
 * PDF 预览单页
 */
export interface ExportPreviewPage {
  /** 页码，从 1 开始 */
  pageNumber: number;
  /** JPEG 预览图 data URL */
  dataUrl: string;
  /** 页宽（像素） */
  width: number;
  /** 页高（像素） */
  height: number;
}

/**
 * PDF 预览结果
 */
export interface ExportPreviewResult {
  /** 分页预览图 */
  pages: ExportPreviewPage[];
  /** 总页数 */
  pageCount: number;
  /** 与预览一致的 PDF Blob，可直接下载避免重复截图 */
  pdfBlob: Blob;
  /** 实际使用的 PDF 分页配置 */
  pdfOptions: ResolvedPdfExportOptions;
  /** 页面布局（毫米） */
  layout: {
    pageWidthMm: number;
    pageHeightMm: number;
    contentWidthMm: number;
    contentHeightMm: number;
  };
}
