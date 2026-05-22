import {
  EXPORT_EXPAND_SELECTOR,
  EXPORT_IGNORE_SELECTOR
} from '../core/selectors';

/**
 * 记录单个 HTMLElement 的内联样式快照
 */
interface StyleSnapshot {
  width: string;
  minWidth: string;
  maxWidth: string;
  boxSizing: string;
  overflow: string;
  overflowX: string;
  overflowY: string;
  maxHeight: string;
  height: string;
}

/**
 * 保存元素内联样式
 * @param element 目标元素
 */
function snapshotInlineStyle(element: HTMLElement): StyleSnapshot {
  return {
    width: element.style.width,
    minWidth: element.style.minWidth,
    maxWidth: element.style.maxWidth,
    boxSizing: element.style.boxSizing,
    overflow: element.style.overflow,
    overflowX: element.style.overflowX,
    overflowY: element.style.overflowY,
    maxHeight: element.style.maxHeight,
    height: element.style.height
  };
}

/**
 * 恢复元素内联样式
 * @param element 目标元素
 * @param snapshot 快照
 */
function restoreInlineStyle(
  element: HTMLElement,
  snapshot: StyleSnapshot
): void {
  element.style.width = snapshot.width;
  element.style.minWidth = snapshot.minWidth;
  element.style.maxWidth = snapshot.maxWidth;
  element.style.boxSizing = snapshot.boxSizing;
  element.style.overflow = snapshot.overflow;
  element.style.overflowX = snapshot.overflowX;
  element.style.overflowY = snapshot.overflowY;
  element.style.maxHeight = snapshot.maxHeight;
  element.style.height = snapshot.height;
}

/**
 * 截图前预处理 DOM，返回恢复函数
 * @param target 导出容器
 */
export async function prepareDomForCapture(
  target: HTMLElement
): Promise<() => void> {
  const restoreFns: Array<() => void> = [];

  const lockedWidth = Math.ceil(
    target.getBoundingClientRect().width || target.offsetWidth
  );
  if (lockedWidth > 0) {
    const targetSnapshot = snapshotInlineStyle(target);
    target.style.width = `${lockedWidth}px`;
    target.style.minWidth = `${lockedWidth}px`;
    target.style.maxWidth = `${lockedWidth}px`;
    target.style.boxSizing = 'border-box';
    restoreFns.push(() => restoreInlineStyle(target, targetSnapshot));
  }

  let ancestor: HTMLElement | null = target.parentElement;
  while (ancestor && ancestor !== document.body) {
    const computed = window.getComputedStyle(ancestor);
    const ancestorSnapshot = snapshotInlineStyle(ancestor);

    ancestor.style.overflow = 'visible';
    ancestor.style.overflowX = 'visible';
    ancestor.style.overflowY = 'visible';

    if (computed.maxHeight !== 'none') {
      ancestor.style.maxHeight = 'none';
    }
    if (computed.height !== 'auto' && computed.height.endsWith('px')) {
      ancestor.style.height = 'auto';
    }

    const ancestorRef = ancestor;
    restoreFns.push(() => restoreInlineStyle(ancestorRef, ancestorSnapshot));
    ancestor = ancestor.parentElement;
  }

  target.querySelectorAll(EXPORT_IGNORE_SELECTOR).forEach((node) => {
    const element = node as HTMLElement;
    const prevDisplay = element.style.display;
    element.style.display = 'none';
    restoreFns.push(() => {
      element.style.display = prevDisplay;
    });
  });

  target.querySelectorAll(EXPORT_EXPAND_SELECTOR).forEach((node) => {
    node.classList.add('is-export-expanded');
    restoreFns.push(() => {
      node.classList.remove('is-export-expanded');
    });
  });

  const prevOverflow = target.style.overflow;
  target.style.overflow = 'visible';
  restoreFns.push(() => {
    target.style.overflow = prevOverflow;
  });

  target.classList.add('is-export-capturing');
  restoreFns.push(() => {
    target.classList.remove('is-export-capturing');
  });

  return () => {
    restoreFns.reverse().forEach((fn) => fn());
  };
}

/**
 * 读取导出截图应使用的宽度
 * @param target 导出容器
 */
export function resolveCaptureWidth(target: HTMLElement): number {
  return Math.ceil(target.getBoundingClientRect().width || target.offsetWidth);
}

/**
 * 读取导出截图应使用的高度
 * @param target 导出容器
 * @param fullPage 是否截取完整内容高度
 */
export function resolveCaptureHeight(
  target: HTMLElement,
  fullPage: boolean
): number {
  if (fullPage) {
    return Math.max(target.scrollHeight, target.offsetHeight);
  }
  return Math.ceil(target.getBoundingClientRect().height || target.offsetHeight);
}
