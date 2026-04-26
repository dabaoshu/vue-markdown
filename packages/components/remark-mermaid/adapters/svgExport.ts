const DEFAULT_EXPORT_PIXEL_RATIO = 2;
const DEFAULT_EXPORT_BG_COLOR = '#ffffff';
const DEFAULT_EXPORT_FONT_FAMILY =
  '"Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif';

const IGNORED_NAMESPACE_URLS = new Set([
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xlink'
]);

/**
 * SVG 光栅化参数
 */
export interface MermaidRasterizeOptions {
  /** 是否移除 foreignObject，默认 false */
  stripForeignObject?: boolean;
  /** 导出像素比，默认 2 */
  pixelRatio?: number;
  /** 背景色，默认白色 */
  backgroundColor?: string;
  /** 文字字体栈 */
  fontFamily?: string;
}

/**
 * 将 foreignObject 中的文本回退为 SVG text，避免兼容导出时文字丢失
 * @param svgElement SVG 根节点
 * @param fontFamily 字体栈
 * @returns {void}
 */
function convertForeignObjectToSvgText(
  svgElement: SVGSVGElement,
  fontFamily: string
): void {
  const svgNs = 'http://www.w3.org/2000/svg';
  const foreignObjects = Array.from(svgElement.querySelectorAll('foreignObject'));

  for (const foreignObject of foreignObjects) {
    const textContent = (foreignObject.textContent || '').trim();
    if (!textContent) continue;

    const x = Number.parseFloat(foreignObject.getAttribute('x') || '0') || 0;
    const y = Number.parseFloat(foreignObject.getAttribute('y') || '0') || 0;
    const width =
      Number.parseFloat(foreignObject.getAttribute('width') || '0') || 0;
    const height =
      Number.parseFloat(foreignObject.getAttribute('height') || '0') || 0;

    const text = document.createElementNS(svgNs, 'text');
    text.setAttribute('x', String(x + width / 2));
    text.setAttribute('y', String(y + height / 2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', '#111827');
    text.setAttribute('font-size', '14');
    text.setAttribute('font-family', fontFamily);
    text.textContent = textContent.replace(/\s+/g, ' ');
    foreignObject.parentNode?.insertBefore(text, foreignObject);
  }
}

/**
 * 为导出场景清理 SVG：可选移除会触发 canvas 污染的节点
 * @param svgElement 原始 SVG 节点
 * @param stripForeignObject 是否移除 foreignObject
 * @param fontFamily 字体栈
 * @returns {SVGSVGElement} 可用于导出的克隆节点
 */
function sanitizeSvgForExport(
  svgElement: SVGSVGElement,
  stripForeignObject: boolean,
  fontFamily: string
): SVGSVGElement {
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  if (stripForeignObject) {
    convertForeignObjectToSvgText(clonedSvg, fontFamily);
    clonedSvg.querySelectorAll('foreignObject').forEach((node) => node.remove());
  }
  return clonedSvg;
}

/**
 * 计算 SVG 导出尺寸
 * @param svgElement SVG 节点
 * @returns {{ width: number; height: number }} 导出尺寸
 */
function getSvgExportSize(
  svgElement: SVGSVGElement
): { width: number; height: number } {
  const rect = svgElement.getBoundingClientRect();
  const widthAttr = Number.parseFloat(svgElement.getAttribute('width') || '0');
  const heightAttr = Number.parseFloat(svgElement.getAttribute('height') || '0');
  const viewBox = svgElement.viewBox?.baseVal;
  const viewBoxWidth = viewBox?.width || 0;
  const viewBoxHeight = viewBox?.height || 0;

  return {
    width: Math.ceil(Math.max(rect.width || 0, widthAttr || 0, viewBoxWidth || 0, 1)),
    height: Math.ceil(
      Math.max(rect.height || 0, heightAttr || 0, viewBoxHeight || 0, 1)
    )
  };
}

/**
 * 规范化 SVG 导出属性，确保离屏渲染时尺寸和字体可用
 * @param svgElement SVG 节点
 * @param fontFamily 字体栈
 * @returns {SVGSVGElement} 规范化后的 SVG
 */
function normalizeSvgForExport(
  svgElement: SVGSVGElement,
  fontFamily: string
): SVGSVGElement {
  const { width, height } = getSvgExportSize(svgElement);
  svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgElement.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  svgElement.setAttribute('width', String(width));
  svgElement.setAttribute('height', String(height));
  if (!svgElement.getAttribute('viewBox')) {
    svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    text, tspan {
      font-family: ${fontFamily};
      text-rendering: geometricPrecision;
    }
  `;
  svgElement.insertBefore(style, svgElement.firstChild);
  return svgElement;
}

/**
 * 提取 SVG 中可能触发跨域污染的外链资源
 * @param svgElement SVG 节点
 * @returns {string[]} 外链地址列表
 */
export function extractExternalResourceRefs(svgElement: SVGSVGElement): string[] {
  const urls = new Set<string>();
  const allElements = Array.from(svgElement.querySelectorAll('*'));

  for (const element of allElements) {
    for (const attribute of Array.from(element.attributes)) {
      const value = attribute.value || '';
      if (IGNORED_NAMESPACE_URLS.has(value)) continue;
      if (/^https?:\/\//i.test(value) || /^\/\//.test(value)) {
        urls.add(value);
      }
      const urlMatch = value.match(/url\((['"]?)(https?:\/\/|\/\/)(.*?)\1\)/i);
      if (urlMatch) {
        urls.add(`url(${urlMatch[2]}${urlMatch[3]})`);
      }
    }
  }

  return Array.from(urls);
}

/**
 * 将 SVG 光栅化为 Canvas
 * @param svgElement SVG 节点
 * @param options 光栅化参数
 * @returns {Promise<HTMLCanvasElement>} 渲染后的 Canvas
 */
export async function rasterizeSvgToCanvas(
  svgElement: SVGSVGElement,
  options: MermaidRasterizeOptions = {}
): Promise<HTMLCanvasElement> {
  const fontFamily = options.fontFamily || DEFAULT_EXPORT_FONT_FAMILY;
  const pixelRatio = options.pixelRatio || DEFAULT_EXPORT_PIXEL_RATIO;
  const backgroundColor = options.backgroundColor || DEFAULT_EXPORT_BG_COLOR;
  const stripForeignObject = options.stripForeignObject === true;

  const clonedSvg = normalizeSvgForExport(
    sanitizeSvgForExport(svgElement, stripForeignObject, fontFamily),
    fontFamily
  );
  const serialized = new XMLSerializer().serializeToString(clonedSvg);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
  const { width, height } = getSvgExportSize(clonedSvg);
  await document.fonts?.ready;

  return await new Promise<HTMLCanvasElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'sync';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(width * pixelRatio));
      canvas.height = Math.max(1, Math.ceil(height * pixelRatio));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('无法创建画布上下文'));
        return;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas);
    };
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = svgDataUrl;
  });
}

/**
 * 下载 SVG 文件（原始保真）
 * @param svgElement SVG 节点
 * @param filename 下载文件名
 * @returns {void}
 */
export function downloadSvgFallback(
  svgElement: SVGSVGElement,
  filename: string = 'mermaid-diagram.svg'
): void {
  const serialized = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([serialized], {
    type: 'image/svg+xml;charset=utf-8'
  });
  const svgUrl = URL.createObjectURL(svgBlob);
  const link = document.createElement('a');
  link.href = svgUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(svgUrl);
}

/**
 * 将 SVG 下载为 PNG 文件
 * @param svgElement SVG 节点
 * @param filename 下载文件名
 * @param options 光栅化参数
 * @returns {Promise<void>}
 */
export async function downloadSvgAsPng(
  svgElement: SVGSVGElement,
  filename: string,
  options: MermaidRasterizeOptions = {}
): Promise<void> {
  const canvas = await rasterizeSvgToCanvas(svgElement, options);
  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG 生成失败'));
        return;
      }
      const pngUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(pngUrl);
      resolve();
    }, 'image/png');
  });
}

/**
 * 将 SVG 复制到剪贴板（PNG）
 * @param svgElement SVG 节点
 * @param options 光栅化参数
 * @returns {Promise<void>}
 */
export async function copySvgAsPng(
  svgElement: SVGSVGElement,
  options: MermaidRasterizeOptions = {}
): Promise<void> {
  const canvas = await rasterizeSvgToCanvas(svgElement, {
    ...options,
    stripForeignObject: true
  });
  await new Promise<void>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('PNG 生成失败'));
        return;
      }
      if (!navigator.clipboard || !window.ClipboardItem) {
        reject(new Error('当前环境不支持图片复制'));
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      resolve();
    }, 'image/png');
  });
}
