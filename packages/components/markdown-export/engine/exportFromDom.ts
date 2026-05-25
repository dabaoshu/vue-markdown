import type {
  CaptureOptions,
  DomExportOptions,
  ExportPreviewPage,
  ExportPreviewResult,
  ExportResult,
  PdfExportOptions
} from '../core/types';
import type { PdfPageBreakContext } from '../core/pdfPagination';
import {
  canvasToPdf,
  collectDomPageBreakContext,
  resolvePdfContentLayout,
  resolvePdfExportOptions,
  scalePageBreakContextToCanvas,
  splitCanvasForPdfPages
} from '../core/pdfPagination';
import { waitForDomStable } from './waitForDomStable';
import {
  prepareDomForCapture,
  resolveCaptureHeight
} from './prepareDomForCapture';
import { captureDom } from './captureDom';
import {
  canvasToBlob,
  copyBlobToClipboard,
  downloadBlob,
  resolveFilename
} from './downloadBlob';

/** 截图流水线配置 */
export interface CapturePipelineOptions {
  capture?: CaptureOptions;
  timeoutMs?: number;
  waitFor?: () => void | Promise<void>;
  beforeCapture?: (target: HTMLElement) => void | Promise<void>;
  afterCapture?: (target: HTMLElement) => void | Promise<void>;
}

/** DOM 截图结果 */
export interface CaptureTargetResult {
  canvas: HTMLCanvasElement;
  pageBreakContext: PdfPageBreakContext;
}

type PreviewFromDomOptions = Omit<DomExportOptions, 'format' | 'filename' | 'target'>;

/**
 * 等待 DOM 就绪并完成截图
 * @param target 导出容器
 * @param options 流水线配置
 */
export async function captureTargetCanvas(
  target: HTMLElement,
  options: CapturePipelineOptions = {}
): Promise<CaptureTargetResult> {
  const timeoutMs = options.timeoutMs ?? 15000;
  const fullPage = options.capture?.fullPage !== false;

  await waitForDomStable(target, timeoutMs);
  if (options.waitFor) await options.waitFor();
  if (options.beforeCapture) await options.beforeCapture(target);

  const restoreDom = await prepareDomForCapture(target);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  try {
    const domContext = collectDomPageBreakContext(target);
    const cssHeight = options.capture?.height ?? resolveCaptureHeight(target, fullPage);
    const canvas = await captureDom(target, options.capture);

    return {
      canvas,
      pageBreakContext: scalePageBreakContextToCanvas(
        domContext,
        canvas.height,
        cssHeight
      )
    };
  } finally {
    restoreDom();
    if (options.afterCapture) await options.afterCapture(target);
  }
}

/**
 * 基于已截图 Canvas 生成分页预览（无需重新截图 DOM）
 * @param canvas 源 Canvas
 * @param options PDF 分页配置
 * @param pageBreakContext 智能分页上下文
 */
export async function buildPdfPreviewFromCanvas(
  canvas: HTMLCanvasElement,
  options: PdfExportOptions = {},
  pageBreakContext?: PdfPageBreakContext
): Promise<ExportPreviewResult> {
  const resolved = resolvePdfExportOptions(options);
  const layout = resolvePdfContentLayout(options);
  const slices = splitCanvasForPdfPages(canvas, options, pageBreakContext);
  const pdfBlob = await canvasToPdf(canvas, options, pageBreakContext);

  const pages: ExportPreviewPage[] = slices.map((slice) => ({
    pageNumber: slice.pageNumber,
    dataUrl: slice.dataUrl,
    width: slice.width,
    height: slice.height
  }));

  return {
    pages,
    pageCount: pages.length,
    pdfBlob,
    pdfOptions: resolved,
    layout: {
      pageWidthMm: layout.pageWidthMm,
      pageHeightMm: layout.pageHeightMm,
      contentWidthMm: layout.contentWidthMm,
      contentHeightMm: layout.contentHeightMm
    }
  };
}

/**
 * 生成 PDF 分页预览（不触发下载）
 * @param target 导出容器
 * @param options 预览配置
 */
export async function previewFromDom(
  target: HTMLElement,
  options: PreviewFromDomOptions = {}
): Promise<ExportPreviewResult> {
  if (!target) throw new Error('previewFromDom: target 不能为空');

  const { canvas, pageBreakContext } = await captureTargetCanvas(target, options);
  return buildPdfPreviewFromCanvas(canvas, options.pdf, pageBreakContext);
}

/**
 * 从已渲染 DOM 导出文档（截图主路径）
 * @param options 导出配置
 */
export async function exportFromDom(
  options: DomExportOptions
): Promise<ExportResult> {
  const { target, format } = options;
  if (!target) throw new Error('exportFromDom: target 不能为空');

  const { canvas, pageBreakContext } = await captureTargetCanvas(target, options);

  if (format === 'pdf') {
    const blob = await canvasToPdf(canvas, options.pdf, pageBreakContext);
    const filename = resolveFilename(options.filename, 'pdf');
    downloadBlob(blob, filename);
    return { format, blob, filename };
  }

  if (format === 'clipboard') {
    const blob = await canvasToBlob(canvas, 'image/png');
    await copyBlobToClipboard(blob);
    return { format, blob };
  }

  if (format === 'png' || format === 'jpeg') {
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'jpeg' ? 0.92 : undefined;
    const blob = await canvasToBlob(canvas, mime, quality);
    const filename = resolveFilename(options.filename, format);
    downloadBlob(blob, filename);
    return { format, blob, filename };
  }

  throw new Error(`不支持的导出格式: ${format}`);
}

/**
 * 导出 PDF 便捷方法
 * @param target DOM 容器
 * @param filename 文件名
 * @param options 其余导出配置
 */
export function exportDomAsPdf(
  target: HTMLElement,
  filename?: string,
  options: Omit<DomExportOptions, 'target' | 'format' | 'filename'> = {}
): Promise<ExportResult> {
  return exportFromDom({ ...options, target, format: 'pdf', filename });
}

/**
 * 导出 PNG 长图便捷方法
 * @param target DOM 容器
 * @param filename 文件名
 * @param options 其余导出配置
 */
export function exportDomAsPng(
  target: HTMLElement,
  filename?: string,
  options: Omit<DomExportOptions, 'target' | 'format' | 'filename'> = {}
): Promise<ExportResult> {
  return exportFromDom({ ...options, target, format: 'png', filename });
}
