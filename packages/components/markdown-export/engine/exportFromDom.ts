import type { DomExportOptions, ExportResult } from '../core/types';
import { waitForDomStable } from './waitForDomStable';
import { prepareDomForCapture } from './prepareDomForCapture';
import { captureDom } from './captureDom';
import { canvasToPdf } from './canvasToPdf';
import {
  canvasToBlob,
  copyBlobToClipboard,
  downloadBlob,
  resolveFilename
} from './downloadBlob';

/**
 * 从已渲染 DOM 导出文档（截图主路径）
 * @param options 导出配置
 */
export async function exportFromDom(
  options: DomExportOptions
): Promise<ExportResult> {
  const { target, format } = options;
  if (!target) {
    throw new Error('exportFromDom: target 不能为空');
  }

  const timeoutMs = options.timeoutMs ?? 15000;

  await waitForDomStable(target, timeoutMs);
  if (options.waitFor) {
    await options.waitFor();
  }

  if (options.beforeCapture) {
    await options.beforeCapture(target);
  }

  const restoreDom = await prepareDomForCapture(target);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  try {
    const canvas = await captureDom(target, options.capture);

    if (format === 'pdf') {
      const blob = await canvasToPdf(canvas, options.pdf);
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
  } finally {
    restoreDom();
    if (options.afterCapture) {
      await options.afterCapture(target);
    }
  }
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
