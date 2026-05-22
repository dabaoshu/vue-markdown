/** 导出时需要镜像到 clone 节点的计算样式属性 */
const EXPORT_COMPUTED_PROPS = [
  'color',
  'background',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-decoration',
  'text-transform',
  'white-space',
  'word-break',
  'word-wrap',
  'overflow-wrap',
  'vertical-align',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-radius',
  'box-shadow',
  'display',
  'flex',
  'flex-direction',
  'flex-wrap',
  'align-items',
  'justify-content',
  'gap',
  'grid-template-columns',
  'opacity',
  'visibility',
  'list-style-type',
  'list-style-position',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'object-fit',
  'fill',
  'stroke'
] as const;

/**
 * 将源节点计算样式镜像到 clone 节点
 * @param source 源节点
 * @param clone clone 节点
 */
export function applyExportComputedStyles(
  source: HTMLElement,
  clone: HTMLElement
): void {
  const computed = window.getComputedStyle(source);

  for (const prop of EXPORT_COMPUTED_PROPS) {
    const value = computed.getPropertyValue(prop);
    if (!value) continue;
    clone.style.setProperty(prop, value);
  }

  const overflow = computed.overflow;
  if (
    overflow === 'hidden' ||
    overflow === 'scroll' ||
    overflow === 'auto' ||
    overflow === 'overlay'
  ) {
    clone.style.overflow = 'visible';
  }

  clone.style.setProperty('-webkit-print-color-adjust', 'exact');
  clone.style.setProperty('print-color-adjust', 'exact');
}

/**
 * 递归同步源 DOM 与 clone DOM 的计算样式
 * @param sourceRoot 源根节点
 * @param cloneRoot clone 根节点
 */
export function mirrorComputedStyles(
  sourceRoot: HTMLElement,
  cloneRoot: HTMLElement
): void {
  applyExportComputedStyles(sourceRoot, cloneRoot);

  const sourceChildren = Array.from(sourceRoot.children);
  const cloneChildren = Array.from(cloneRoot.children);

  for (let i = 0; i < sourceChildren.length; i += 1) {
    const sourceChild = sourceChildren[i];
    const cloneChild = cloneChildren[i];
    if (
      sourceChild instanceof HTMLElement &&
      cloneChild instanceof HTMLElement
    ) {
      mirrorComputedStyles(sourceChild, cloneChild);
    }
  }
}

/**
 * 清理 clone 文档中影响截图的节点与样式
 * @param cloneRoot clone 根节点
 */
export function sanitizeCloneForExport(cloneRoot: HTMLElement): void {
  cloneRoot.querySelectorAll('[data-export-ignore]').forEach((node) => {
    (node as HTMLElement).style.display = 'none';
  });

  cloneRoot.querySelectorAll('*').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const overflow = node.style.overflow || '';
    if (['hidden', 'scroll', 'auto', 'overlay'].includes(overflow)) {
      node.style.overflow = 'visible';
    }
  });
}
