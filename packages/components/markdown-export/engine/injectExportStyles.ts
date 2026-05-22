import {
  EXPORT_CAPTURE_STYLE_ID,
  getExportCaptureStyleText
} from '../core/exportCaptureStyles';

/**
 * 向 clone 文档注入导出修正样式
 * @param doc clone 文档
 */
export function injectExportStyles(doc: Document): void {
  if (doc.getElementById(EXPORT_CAPTURE_STYLE_ID)) return;

  const style = doc.createElement('style');
  style.id = EXPORT_CAPTURE_STYLE_ID;
  style.textContent = getExportCaptureStyleText();
  doc.head.appendChild(style);
}
