import {
  STREAM_CHUNK_MAX,
  STREAM_CHUNK_MIN,
  STREAM_INTERVAL_MS
} from './constants';

/**
 * 从当前光标再切一块可见文本。
 *
 * @param fullText 完整目标 Markdown
 * @param cursor 已输出长度
 * @param chunkSize 本块字符数（须 ≥ 1）
 * @returns 新光标与从开头到新光标的全文
 */
export function takeStreamChunk(
  fullText: string,
  cursor: number,
  chunkSize: number
): { cursor: number; text: string } {
  const size = Math.max(1, chunkSize);
  const next = Math.min(Math.max(0, cursor) + size, fullText.length);
  return {
    cursor: next,
    text: fullText.slice(0, next)
  };
}

/**
 * 对话气泡用的流式写出控制器。
 */
export interface SceneMarkdownStream {
  /** 是否正在逐块输出 */
  readonly running: boolean;
  /** 从指定光标开始写 */
  start: (fromIndex?: number) => void;
  /** 停止输出，不触发完成回调 */
  stop: () => void;
  /** 停止并释放定时器 */
  dispose: () => void;
}

/**
 * 创建场景对话流式控制器（节奏对齐工作台逐块回放，不接入 MarkdownWorkbench）。
 *
 * @param fullText 完整回复 Markdown
 * @param options.onChunk 每次追加后的当前全文
 * @param options.onComplete 全部写完
 */
export function createSceneMarkdownStream(
  fullText: string,
  options: {
    onChunk: (partialText: string) => void;
    onComplete?: () => void;
  }
): SceneMarkdownStream {
  let running = false;
  let cancelled = false;
  let cursor = 0;
  let timerId: ReturnType<typeof setTimeout> | undefined;

  /**
   * 随机块长，模拟不均匀的模型输出。
   */
  function nextChunkSize(): number {
    const span = Math.max(STREAM_CHUNK_MAX - STREAM_CHUNK_MIN, 0);
    return STREAM_CHUNK_MIN + Math.floor(Math.random() * (span + 1));
  }

  function clearTimer(): void {
    if (timerId === undefined) {
      return;
    }
    window.clearTimeout(timerId);
    timerId = undefined;
  }

  function tick(): void {
    if (cancelled || cursor >= fullText.length) {
      running = false;
      clearTimer();
      if (!cancelled && cursor >= fullText.length) {
        options.onComplete?.();
      }
      return;
    }

    const step = takeStreamChunk(fullText, cursor, nextChunkSize());
    cursor = step.cursor;
    options.onChunk(step.text);

    if (cursor >= fullText.length) {
      running = false;
      clearTimer();
      options.onComplete?.();
      return;
    }

    timerId = window.setTimeout(tick, STREAM_INTERVAL_MS);
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
      timerId = window.setTimeout(tick, STREAM_INTERVAL_MS);
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
