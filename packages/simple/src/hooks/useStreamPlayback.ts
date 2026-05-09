import { ref, type Ref } from 'vue';

/**
 * 流式回放控制器
 */
export interface StreamPlaybackController {
  isStreaming: Ref<boolean>;
  startStreamTest: (code: string) => void;
  stopStreamTest: () => void;
  toggleStreamTest: () => void;
}

/**
 * 流式回放配置
 */
export interface StreamPlaybackOptions {
  /**
   * 分片大小（字符数）
   */
  chunkSize?: number;
  /**
   * 回放间隔（毫秒）
   */
  intervalMs?: number;
  onChunk?: (chunk: string) => void;
}

/**
 * 创建流式回放能力（将当前编辑内容清空后按分片重新输出）
 * @param options 流式回放配置
 * @returns 回放控制器
 */
export function useStreamPlayback(
  options: StreamPlaybackOptions = {}
): StreamPlaybackController {
  const isStreaming = ref(false);
  const streamTimer = ref<ReturnType<typeof setInterval> | null>(null);
  const streamCursor = ref(0);
  const streamSource = ref('');

  const chunkSize = Math.max(1, options.chunkSize ?? 8);
  const intervalMs = Math.max(16, options.intervalMs ?? 60);

  /**  
   * 停止流式回放并清理定时器
   */
  function stopStreamTest() {
    if (streamTimer.value !== null) {
      clearInterval(streamTimer.value);
      streamTimer.value = null;
    }
    isStreaming.value = false;
  }

  /**
   * 开始流式回放（读取当前内容后清空并逐段回放）
   */
  function startStreamTest(code: string) {
    stopStreamTest();
    streamSource.value = code;
    streamCursor.value = 0;

    if (streamSource.value.length === 0) {
      stopStreamTest();
      return;
    }

    isStreaming.value = true;

    streamTimer.value = setInterval(() => {
      if (streamCursor.value >= streamSource.value.length) {
        stopStreamTest();
        return;
      }

      streamCursor.value += chunkSize;
      options.onChunk?.(
        streamSource.value.slice(
          streamCursor.value,
          streamCursor.value + chunkSize
        )
      );
    }, intervalMs);
  }

  /**
   * 切换流式回放状态
   */
  function toggleStreamTest() {
    if (isStreaming.value) {
      stopStreamTest();
      return;
    }
    startStreamTest(streamSource.value);
  }

  return {
    isStreaming,
    startStreamTest,
    stopStreamTest,
    toggleStreamTest
  };
}
