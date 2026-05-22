/**
 * 触发浏览器下载 Blob
 * @param blob 文件内容
 * @param filename 文件名
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 根据格式补全文件名
 * @param filename 原始文件名
 * @param format 导出格式
 */
export function resolveFilename(
  filename: string | undefined,
  format: 'pdf' | 'png' | 'jpeg'
): string {
  const base = filename?.trim() || `markdown-export-${Date.now()}`;
  const ext = `.${format}`;
  return base.endsWith(ext) ? base : `${base}${ext}`;
}

/**
 * Canvas 转 Blob
 * @param canvas Canvas 节点
 * @param type MIME 类型
 * @param quality JPEG 质量
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas 转 Blob 失败'));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

/**
 * 将 PNG 写入剪贴板
 * @param blob PNG Blob
 */
export async function copyBlobToClipboard(blob: Blob): Promise<void> {
  if (!navigator.clipboard || !window.ClipboardItem) {
    throw new Error('当前环境不支持图片复制到剪贴板');
  }
  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob
    })
  ]);
}
