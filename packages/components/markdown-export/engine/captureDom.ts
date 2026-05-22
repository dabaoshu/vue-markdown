import type { CaptureOptions } from '../core/types';
import { injectExportStyles } from './injectExportStyles';
import {
  mirrorComputedStyles,
  sanitizeCloneForExport
} from './inlineCloneStyles';
import {
  resolveCaptureHeight,
  resolveCaptureWidth
} from './prepareDomForCapture';

/**
 * 将 DOM 节点截为 Canvas（默认 html2canvas）
 * @param target 导出容器
 * @param options 截图参数
 */
export async function captureDom(
  target: HTMLElement,
  options: CaptureOptions = {}
): Promise<HTMLCanvasElement> {
  const pixelRatio = options.pixelRatio ?? 2;
  const backgroundColor = options.backgroundColor ?? '#ffffff';
  const fullPage = options.fullPage !== false;
  const syncStyles = options.syncStyles !== false;

  const width = options.width ?? resolveCaptureWidth(target);
  const height =
    options.height ?? resolveCaptureHeight(target, fullPage);

  const html2canvasModule = await import('html2canvas');
  const html2canvas = html2canvasModule.default;

  return html2canvas(target, {
    backgroundColor,
    scale: pixelRatio,
    width,
    height,
    useCORS: true,
    allowTaint: false,
    logging: false,
    imageTimeout: 15000,
    removeContainer: true,
    onclone: (clonedDocument, clonedElement) => {
      injectExportStyles(clonedDocument);

      if (!(clonedElement instanceof HTMLElement)) return;

      clonedElement.classList.add('is-export-capturing');
      clonedElement.style.width = `${width}px`;
      clonedElement.style.minWidth = `${width}px`;
      clonedElement.style.maxWidth = `${width}px`;
      clonedElement.style.height = 'auto';
      clonedElement.style.minHeight = `${height}px`;
      clonedElement.style.overflow = 'visible';
      clonedElement.style.boxSizing = 'border-box';

      if (syncStyles) {
        mirrorComputedStyles(target, clonedElement);
      }

      sanitizeCloneForExport(clonedElement);
    }
  });
}
