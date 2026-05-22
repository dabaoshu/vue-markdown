import { cropCanvas } from '../core/cropCanvas';
import type { PdfExportOptions } from '../core/types';

/**
 * 将长 Canvas 按页高切片写入 PDF
 * @param canvas 源 Canvas
 * @param options PDF 参数
 */
export async function canvasToPdf(
  canvas: HTMLCanvasElement,
  options: PdfExportOptions = {}
): Promise<Blob> {
  const { jsPDF } = await import('jspdf');

  const orientation = options.orientation ?? 'portrait';
  const pageSize = options.pageSize ?? 'a4';
  const marginMm = options.marginMm ?? 10;
  const imageQuality = options.imageQuality ?? 0.92;

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginMm * 2;
  const contentHeight = pageHeight - marginMm * 2;

  const sliceHeightPx = Math.max(
    1,
    Math.floor((contentHeight / contentWidth) * canvas.width)
  );

  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < canvas.height) {
    if (pageIndex > 0) {
      pdf.addPage();
    }

    const remainingHeight = canvas.height - offsetY;
    const currentSliceHeight = Math.min(sliceHeightPx, remainingHeight);
    const sliceCanvas = cropCanvas(
      canvas,
      0,
      offsetY,
      canvas.width,
      currentSliceHeight
    );
    const imgData = sliceCanvas.toDataURL('image/jpeg', imageQuality);
    const imgHeightMm = (sliceCanvas.height / sliceCanvas.width) * contentWidth;

    pdf.addImage(imgData, 'JPEG', marginMm, marginMm, contentWidth, imgHeightMm);

    offsetY += currentSliceHeight;
    pageIndex += 1;
  }

  return pdf.output('blob');
}
