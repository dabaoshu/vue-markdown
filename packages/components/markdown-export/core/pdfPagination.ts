import type { PdfExportOptions, ResolvedPdfExportOptions } from './types';
import { EXPORT_IGNORE_SELECTOR, EXPORT_KEEP_TOGETHER_SELECTOR } from './selectors';

/** 预设页面尺寸（毫米，短边 × 长边） */
export const PDF_PAGE_SIZE_MM = {
  a4: { width: 210, height: 297 },
  letter: { width: 216, height: 279 }
} as const;

/** PDF 导出默认配置 */
export const DEFAULT_PDF_EXPORT_OPTIONS: ResolvedPdfExportOptions = {
  mode: 'paginated',
  pageSize: 'a4',
  orientation: 'portrait',
  pageWidthMm: PDF_PAGE_SIZE_MM.a4.width,
  pageHeightMm: PDF_PAGE_SIZE_MM.a4.height,
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  imageQuality: 0.92,
  smartBreak: true
};

/** PDF 内容区尺寸（毫米） */
export interface PdfContentLayout {
  pageWidthMm: number;
  pageHeightMm: number;
  contentWidthMm: number;
  contentHeightMm: number;
  margins: ResolvedPdfExportOptions['margins'];
}

/** DOM 元素垂直区间 */
export interface ElementBand {
  top: number;
  bottom: number;
  height: number;
}

/** 智能分页上下文（Canvas 像素） */
export interface PdfPageBreakContext {
  elementBands: ElementBand[];
  breakCandidates: number[];
}

/** PDF 分页切片 */
export interface PdfPageSlice {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
}

const ATOMIC_BLOCK_SELECTOR = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'blockquote',
  'table', 'ul', 'ol', 'li', 'hr', 'img', 'svg', 'figure', 'tr', 'thead', 'tbody',
  '.mermaid-block', '.mermaid-block__surface', '.code-block',
  '[class*="code-highlight"]', '[class*="katex-display"]',
  EXPORT_KEEP_TOGETHER_SELECTOR
].join(',');

/**
 * 合并 PDF 配置
 * @param base 基础配置
 * @param patch 增量配置
 */
export function mergePdfOptions(
  base: PdfExportOptions = {},
  patch: PdfExportOptions = {}
): PdfExportOptions {
  return {
    ...base,
    ...patch,
    customPageSize: patch.customPageSize ?? base.customPageSize,
    margins: { ...base.margins, ...patch.margins }
  };
}

/**
 * 解析 PDF 分页配置
 * @param options 原始配置
 */
export function resolvePdfExportOptions(
  options: PdfExportOptions = {}
): ResolvedPdfExportOptions {
  const mode = options.mode ?? DEFAULT_PDF_EXPORT_OPTIONS.mode;
  const pageSize = options.pageSize ?? DEFAULT_PDF_EXPORT_OPTIONS.pageSize;
  const orientation = options.orientation ?? DEFAULT_PDF_EXPORT_OPTIONS.orientation;
  const imageQuality = options.imageQuality ?? DEFAULT_PDF_EXPORT_OPTIONS.imageQuality;
  const smartBreak = options.smartBreak ?? DEFAULT_PDF_EXPORT_OPTIONS.smartBreak;
  const uniformMargin = options.marginMm ?? DEFAULT_PDF_EXPORT_OPTIONS.margins.top;

  const margins = {
    top: options.margins?.top ?? uniformMargin,
    right: options.margins?.right ?? uniformMargin,
    bottom: options.margins?.bottom ?? uniformMargin,
    left: options.margins?.left ?? uniformMargin
  };

  let pageWidthMm: number;
  let pageHeightMm: number;

  if (pageSize === 'custom') {
    const custom = options.customPageSize;
    if (!custom?.widthMm || !custom?.heightMm) {
      throw new Error('resolvePdfExportOptions: custom 模式需提供 customPageSize');
    }
    pageWidthMm = custom.widthMm;
    pageHeightMm = custom.heightMm;
  } else {
    const base = PDF_PAGE_SIZE_MM[pageSize];
    pageWidthMm = orientation === 'landscape' ? base.height : base.width;
    pageHeightMm = orientation === 'landscape' ? base.width : base.height;
  }

  return {
    mode, pageSize, orientation, pageWidthMm, pageHeightMm,
    margins, imageQuality, customPageSize: options.customPageSize, smartBreak
  };
}

/**
 * 解析 PDF 内容区布局
 * @param options PDF 参数
 */
export function resolvePdfContentLayout(options: PdfExportOptions = {}): PdfContentLayout {
  const resolved = resolvePdfExportOptions(options);
  return {
    pageWidthMm: resolved.pageWidthMm,
    pageHeightMm: resolved.pageHeightMm,
    contentWidthMm: resolved.pageWidthMm - resolved.margins.left - resolved.margins.right,
    contentHeightMm: resolved.pageHeightMm - resolved.margins.top - resolved.margins.bottom,
    margins: resolved.margins
  };
}

/**
 * 计算理想分页切片高度（Canvas 像素）
 * @param canvasWidth Canvas 宽度
 * @param layout 内容区布局
 */
export function computePdfSliceHeightPx(
  canvasWidth: number,
  layout: PdfContentLayout
): number {
  if (canvasWidth <= 0 || layout.contentWidthMm <= 0) return 1;
  return Math.max(
    1,
    Math.floor((layout.contentHeightMm / layout.contentWidthMm) * canvasWidth)
  );
}

/**
 * 计算单页模式下图片尺寸（毫米）
 * @param canvas 源 Canvas
 * @param layout 内容区布局
 */
export function computeSinglePageImageSizeMm(
  canvas: HTMLCanvasElement,
  layout: PdfContentLayout
): { widthMm: number; heightMm: number } {
  const aspect = canvas.width / canvas.height;
  const contentAspect = layout.contentWidthMm / layout.contentHeightMm;
  if (aspect > contentAspect) {
    const widthMm = layout.contentWidthMm;
    return { widthMm, heightMm: widthMm / aspect };
  }
  const heightMm = layout.contentHeightMm;
  return { widthMm: heightMm * aspect, heightMm };
}

function isVisibleElement(element: HTMLElement): boolean {
  if (element.closest(EXPORT_IGNORE_SELECTOR)) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * 从 DOM 收集块级边界（CSS 像素）
 * @param target 导出容器
 */
export function collectDomPageBreakContext(target: HTMLElement) {
  const targetRect = target.getBoundingClientRect();
  const cssHeight = Math.max(target.scrollHeight, target.offsetHeight);
  const bands: ElementBand[] = [];
  const candidates = new Set<number>([0, cssHeight]);

  target.querySelectorAll(ATOMIC_BLOCK_SELECTOR).forEach((node) => {
    if (!(node instanceof HTMLElement) || !isVisibleElement(node)) return;
    const rect = node.getBoundingClientRect();
    if (rect.height < 6) return;

    const top = Math.max(0, rect.top - targetRect.top);
    const bottom = Math.min(cssHeight, rect.bottom - targetRect.top);
    const height = bottom - top;
    if (height < 6 || bottom <= 0 || top >= cssHeight) return;

    bands.push({ top, bottom, height });
    candidates.add(top);
    candidates.add(bottom);
  });

  return {
    elementBands: bands,
    breakCandidates: Array.from(candidates).sort((a, b) => a - b),
    cssHeight
  };
}

/**
 * 将分页上下文映射到 Canvas 像素
 * @param context DOM 上下文
 * @param canvasHeight Canvas 高度
 * @param cssHeight CSS 高度
 */
export function scalePageBreakContextToCanvas(
  context: Pick<PdfPageBreakContext, 'elementBands' | 'breakCandidates'>,
  canvasHeight: number,
  cssHeight: number
): PdfPageBreakContext {
  if (cssHeight <= 0) {
    return { elementBands: [], breakCandidates: [0, canvasHeight] };
  }

  const scaleY = canvasHeight / cssHeight;
  const scale = (value: number) =>
    Math.round(Math.max(0, Math.min(canvasHeight, value * scaleY)));

  return {
    elementBands: context.elementBands.map((band) => {
      const top = scale(band.top);
      const bottom = scale(band.bottom);
      return { top, bottom, height: Math.max(0, bottom - top) };
    }),
    breakCandidates: Array.from(
      new Set([0, canvasHeight, ...context.breakCandidates.map(scale)])
    ).sort((a, b) => a - b)
  };
}

function pickPrimaryCrossingBand(crossing: ElementBand[]): ElementBand {
  return crossing.reduce((best, band) => (band.top < best.top ? band : best));
}

function snapToNearestCandidate(
  idealY: number,
  minY: number,
  maxY: number,
  candidates: number[]
): number {
  let best = idealY;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    if (candidate < minY || candidate > maxY) continue;
    const distance = Math.abs(candidate - idealY);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

function computeSmartPageBreakOffsets(
  canvasHeight: number,
  idealSliceHeight: number,
  context: PdfPageBreakContext
): number[] {
  if (canvasHeight <= 0 || idealSliceHeight <= 0) return [0, canvasHeight];

  const offsets = [0];
  let currentOffset = 0;

  while (currentOffset < canvasHeight - 1) {
    const remaining = canvasHeight - currentOffset;
    if (remaining <= idealSliceHeight * 1.02) break;

    const idealNext = currentOffset + idealSliceHeight;
    const minNext = currentOffset + idealSliceHeight * 0.45;
    const maxNext = Math.min(currentOffset + idealSliceHeight * 1.22, canvasHeight);
    const minSlicePx = idealSliceHeight * 0.28;

    const crossing = context.elementBands.filter(
      (band) => band.top < idealNext - 2 && band.bottom > idealNext + 2
    );

    let nextOffset = idealNext;

    if (crossing.length > 0) {
      const primary = pickPrimaryCrossingBand(crossing);
      if (primary.height <= idealSliceHeight) {
        const breakBefore = primary.top;
        const breakAfter = primary.bottom;
        const roomBefore = breakBefore - currentOffset;
        const roomAfterPage = breakAfter - currentOffset;

        if (roomBefore >= minSlicePx && breakBefore >= minNext && breakBefore <= maxNext) {
          nextOffset = breakBefore;
        } else if (roomAfterPage <= idealSliceHeight * 1.12 && breakAfter <= maxNext) {
          nextOffset = breakAfter;
        } else if (roomBefore >= minSlicePx) {
          nextOffset = breakBefore;
        } else if (breakAfter <= maxNext) {
          nextOffset = breakAfter;
        }
      }
    } else {
      nextOffset = snapToNearestCandidate(
        idealNext,
        Math.max(minNext, idealNext - idealSliceHeight * 0.18),
        Math.min(maxNext, idealNext + idealSliceHeight * 0.06),
        context.breakCandidates
      );
    }

    nextOffset = Math.max(Math.min(nextOffset, canvasHeight), currentOffset + 1);
    if (nextOffset <= currentOffset) {
      nextOffset = Math.min(currentOffset + idealSliceHeight, canvasHeight);
    }

    offsets.push(nextOffset);
    currentOffset = nextOffset;
  }

  if (offsets[offsets.length - 1] !== canvasHeight) offsets.push(canvasHeight);
  return offsets;
}

function computeSliceHeightsFromOffsets(canvasHeight: number, offsets: number[]): number[] {
  const heights: number[] = [];
  for (let index = 0; index < offsets.length - 1; index += 1) {
    const height = offsets[index + 1] - offsets[index];
    if (height > 0) heights.push(height);
  }
  const tail = canvasHeight - heights.reduce((sum, h) => sum + h, 0);
  if (tail > 0) heights.push(tail);
  return heights;
}

function computePdfSliceHeights(
  canvasWidth: number,
  canvasHeight: number,
  layout: PdfContentLayout,
  context?: PdfPageBreakContext,
  smartBreak = true
): number[] {
  const idealSliceHeight = computePdfSliceHeightPx(canvasWidth, layout);

  if (!smartBreak || !context?.elementBands.length) {
    const heights: number[] = [];
    let offsetY = 0;
    while (offsetY < canvasHeight) {
      const slice = Math.min(idealSliceHeight, canvasHeight - offsetY);
      heights.push(slice);
      offsetY += slice;
    }
    return heights;
  }

  return computeSliceHeightsFromOffsets(
    canvasHeight,
    computeSmartPageBreakOffsets(canvasHeight, idealSliceHeight, context)
  );
}

function cropCanvas(
  source: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  canvas.width = safeWidth;
  canvas.height = safeHeight;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建 Canvas 2D 上下文');

  context.drawImage(source, x, y, safeWidth, safeHeight, 0, 0, safeWidth, safeHeight);
  return canvas;
}

/**
 * 将 Canvas 切分为 PDF 分页切片
 * @param canvas 源 Canvas
 * @param options PDF 参数
 * @param pageBreakContext 智能分页上下文
 */
export function splitCanvasForPdfPages(
  canvas: HTMLCanvasElement,
  options: PdfExportOptions = {},
  pageBreakContext?: PdfPageBreakContext
): PdfPageSlice[] {
  const resolved = resolvePdfExportOptions(options);
  const imageQuality = resolved.imageQuality;

  if (resolved.mode === 'single') {
    return [{
      pageNumber: 1,
      canvas,
      dataUrl: canvas.toDataURL('image/jpeg', imageQuality),
      width: canvas.width,
      height: canvas.height
    }];
  }

  const layout = resolvePdfContentLayout(options);
  const sliceHeights = computePdfSliceHeights(
    canvas.width, canvas.height, layout, pageBreakContext, resolved.smartBreak
  );

  let offsetY = 0;
  return sliceHeights.map((sliceHeight, index) => {
    const sliceCanvas = cropCanvas(canvas, 0, offsetY, canvas.width, sliceHeight);
    offsetY += sliceHeight;
    return {
      pageNumber: index + 1,
      canvas: sliceCanvas,
      dataUrl: sliceCanvas.toDataURL('image/jpeg', imageQuality),
      width: sliceCanvas.width,
      height: sliceCanvas.height
    };
  });
}

/**
 * 将 Canvas 写入 PDF Blob
 * @param canvas 源 Canvas
 * @param options PDF 参数
 * @param pageBreakContext 智能分页上下文
 */
export async function canvasToPdf(
  canvas: HTMLCanvasElement,
  options: PdfExportOptions = {},
  pageBreakContext?: PdfPageBreakContext
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const resolved = resolvePdfExportOptions(options);
  const layout = resolvePdfContentLayout(options);

  const pdf = new jsPDF({
    orientation: resolved.orientation,
    unit: 'mm',
    format: resolved.pageSize === 'custom'
      ? [resolved.pageWidthMm, resolved.pageHeightMm]
      : resolved.pageSize
  });

  if (resolved.mode === 'single') {
    const imgData = canvas.toDataURL('image/jpeg', resolved.imageQuality);
    const { widthMm, heightMm } = computeSinglePageImageSizeMm(canvas, layout);
    pdf.addImage(
      imgData, 'JPEG',
      layout.margins.left + (layout.contentWidthMm - widthMm) / 2,
      layout.margins.top + (layout.contentHeightMm - heightMm) / 2,
      widthMm, heightMm
    );
    return pdf.output('blob');
  }

  splitCanvasForPdfPages(canvas, options, pageBreakContext).forEach((slice, index) => {
    if (index > 0) pdf.addPage();
    pdf.addImage(
      slice.dataUrl, 'JPEG',
      layout.margins.left, layout.margins.top,
      layout.contentWidthMm,
      (slice.height / slice.width) * layout.contentWidthMm
    );
  });

  return pdf.output('blob');
}
