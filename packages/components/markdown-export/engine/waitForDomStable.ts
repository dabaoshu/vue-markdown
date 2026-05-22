/**
 * 延迟指定毫秒
 * @param ms 毫秒数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * 在超时时间内轮询条件
 * @param predicate 条件函数
 * @param timeoutMs 超时毫秒
 * @param intervalMs 轮询间隔
 */
async function waitUntil(
  predicate: () => boolean,
  timeoutMs: number,
  intervalMs = 80
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await sleep(intervalMs);
  }
  throw new Error('等待 DOM 渲染稳定超时');
}

/**
 * 等待容器内所有图片加载完成
 * @param root 根节点
 */
async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        })
    )
  );
}

/**
 * 等待选择器匹配的元素全部出现（optional 为 true 时无匹配则立即通过）
 * @param root 根节点
 * @param selector CSS 选择器
 * @param optional 是否可选
 * @param timeoutMs 超时
 */
async function waitForOptionalSelector(
  root: HTMLElement,
  selector: string,
  optional: boolean,
  timeoutMs: number
): Promise<void> {
  const nodes = root.querySelectorAll(selector);
  if (nodes.length === 0 && optional) return;

  await waitUntil(() => root.querySelectorAll(selector).length > 0, timeoutMs);
}

/**
 * 等待选择器匹配的元素全部消失
 * @param root 根节点
 * @param selector CSS 选择器
 * @param timeoutMs 超时
 */
async function waitForNoSelector(
  root: HTMLElement,
  selector: string,
  timeoutMs: number
): Promise<void> {
  await waitUntil(() => root.querySelectorAll(selector).length === 0, timeoutMs);
}

/**
 * 连续若干帧 layout 尺寸不变则视为稳定
 * @param root 根节点
 * @param stableFrames 稳定帧数
 * @param timeoutMs 超时
 */
async function waitForLayoutStable(
  root: HTMLElement,
  stableFrames: number,
  timeoutMs: number
): Promise<void> {
  let lastHeight = -1;
  let stableCount = 0;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const height = root.scrollHeight;
    if (height === lastHeight) {
      stableCount += 1;
      if (stableCount >= stableFrames) return;
    } else {
      stableCount = 0;
      lastHeight = height;
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
}

/**
 * 等待 DOM 渲染稳定后再截图
 * @param root 导出容器
 * @param timeoutMs 最大等待毫秒
 */
export async function waitForDomStable(
  root: HTMLElement,
  timeoutMs = 15000
): Promise<void> {
  await document.fonts?.ready;
  await waitForImages(root);

  await waitForNoSelector(root, '[data-export-loading]', timeoutMs);

  const readyNodes = root.querySelectorAll('[data-export-ready]');
  if (readyNodes.length > 0) {
    await waitUntil(
      () =>
        Array.from(root.querySelectorAll('[data-export-ready]')).every(
          (node) => node.getAttribute('data-export-ready') === 'true'
        ),
      timeoutMs
    );
  }

  const mermaidBlocks = root.querySelectorAll('.mermaid-block');
  if (mermaidBlocks.length > 0) {
    await waitForOptionalSelector(
      root,
      '.mermaid-block svg, .mermaid-block__surface svg',
      true,
      timeoutMs
    );
  }

  await waitForLayoutStable(root, 2, timeoutMs);
}
