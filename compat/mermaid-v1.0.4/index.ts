import { rasterizeSvgToCanvas } from './svgExport';

/** 仅覆盖旧版 Mermaid 卡片实际使用的 html2canvas 参数。 */
export interface MermaidCaptureOptions {
  backgroundColor?: string;
  scale?: number;
  /** 为兼容旧调用保留；SVG 导出不会主动请求或内联外部图片。 */
  useCORS?: boolean;
  /** 为兼容旧调用保留；不允许污染画布。 */
  allowTaint?: false;
  /** 为兼容旧调用保留；兼容层不打印截图日志。 */
  logging?: boolean;
}

/**
 * 旧版 Mermaid 截图入口的局部替代，返回值仍为 Canvas。
 * 仅用于 Mermaid 预览容器，不能作为通用 html2canvas 替代品。
 * 兼容 getRootElement()，无需升级组件以获得 getSvgElement()。
 */
export default async function captureMermaid(
  root: HTMLElement | SVGSVGElement,
  options: MermaidCaptureOptions = {}
): Promise<HTMLCanvasElement> {
  const svg = root?.namespaceURI === 'http://www.w3.org/2000/svg' && root.localName === 'svg'
    ? root as SVGSVGElement
    : root?.querySelector<SVGSVGElement>('svg');
  if (!svg) {
    throw new Error('当前预览中没有已渲染的 Mermaid SVG，请等待渲染完成后再导出');
  }
  const scale = options.scale;
  return rasterizeSvgToCanvas(svg, {
    pixelRatio: typeof scale === 'number' && Number.isFinite(scale) && scale > 0 ? scale : 2,
    backgroundColor: options.backgroundColor ?? '#ffffff',
    stripForeignObject: true
  });
}
