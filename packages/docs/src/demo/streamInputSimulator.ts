/**
 * 流式输入模拟器配置。
 */
export interface StreamInputOptions {
  /** 每次追加的最小字符数 */
  chunkMin?: number;
  /** 每次追加的最大字符数 */
  chunkMax?: number;
  /** 两次追加之间的间隔（毫秒） */
  intervalMs?: number;
  /** 每次追加后的回调，参数为当前已输出的全文 */
  onChunk: (partialText: string) => void;
  /** 全部输出完成 */
  onComplete?: () => void;
}

/**
 * 流式输入控制器，用于模拟 AI 逐块写入 Markdown。
 */
export interface StreamInputController {
  /** 是否正在流式输出 */
  readonly running: boolean;
  /** 开始流式输出；可指定从全文中的起始位置继续 */
  start: (fromIndex?: number) => void;
  /** 停止流式输出 */
  stop: () => void;
  /** 释放定时器与状态 */
  dispose: () => void;
}

/**
 * 创建流式输入模拟控制器。
 * @param fullText 完整目标文本
 * @param options 流式参数与回调
 */
export function createStreamInputController(
  fullText: string,
  options: StreamInputOptions
): StreamInputController {
  const chunkMin = options.chunkMin ?? 2;
  const chunkMax = options.chunkMax ?? 8;
  const intervalMs = options.intervalMs ?? 48;

  let running = false;
  let cancelled = false;
  let cursor = 0;
  let timerId: ReturnType<typeof setTimeout> | undefined;

  /**
   * 生成随机块大小，模拟不均匀的网络/模型输出节奏。
   */
  function nextChunkSize(): number {
    const span = Math.max(chunkMax - chunkMin, 0);
    return chunkMin + Math.floor(Math.random() * (span + 1));
  }

  function clearTimer() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  }

  function tick() {
    if (cancelled || cursor >= fullText.length) {
      running = false;
      clearTimer();
      if (!cancelled && cursor >= fullText.length) {
        options.onComplete?.();
      }
      return;
    }

    cursor = Math.min(cursor + nextChunkSize(), fullText.length);
    options.onChunk(fullText.slice(0, cursor));

    if (cursor >= fullText.length) {
      running = false;
      clearTimer();
      options.onComplete?.();
      return;
    }

    timerId = setTimeout(tick, intervalMs);
  }

  return {
    get running() {
      return running;
    },
    start(fromIndex = 0) {
      clearTimer();
      cancelled = false;
      cursor = Math.max(0, Math.min(fromIndex, fullText.length));
      running = true;

      if (cursor >= fullText.length) {
        options.onChunk(fullText);
        running = false;
        options.onComplete?.();
        return;
      }

      options.onChunk(fullText.slice(0, cursor));
      timerId = setTimeout(tick, intervalMs);
    },
    stop() {
      cancelled = true;
      running = false;
      clearTimer();
    },
    dispose() {
      this.stop();
    }
  };
}
