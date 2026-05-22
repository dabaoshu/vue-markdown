/**
 * 从 Canvas 裁剪指定区域
 * @param source 源 Canvas
 * @param x 起始 x
 * @param y 起始 y
 * @param width 裁剪宽度
 * @param height 裁剪高度
 * @returns 裁剪后的 Canvas
 */
export function cropCanvas(
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
  if (!context) {
    throw new Error('无法创建 Canvas 2D 上下文');
  }

  context.drawImage(
    source,
    x,
    y,
    safeWidth,
    safeHeight,
    0,
    0,
    safeWidth,
    safeHeight
  );
  return canvas;
}
