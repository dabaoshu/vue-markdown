import { onMounted, onUnmounted, ref, watch, type Ref, type WatchSource } from 'vue';

/** 轮询停止原因 */
export type PollingStopReason =
  | 'condition'
  | 'maxAttempts'
  | 'timeout'
  | 'manual'
  | 'error';

/**
 * 单次轮询请求上下文
 */
export interface PollingRequestContext {
  /** 用于取消进行中的请求 */
  signal: AbortSignal;
}

/**
 * 轮询配置
 */
export interface UsePollingOptions<T> {
  /**
   * 轮询请求函数，可通过 signal 响应取消
   */
  request: (context: PollingRequestContext) => Promise<T>;
  /**
   * 中止条件：返回 true 时停止轮询
   */
  shouldStop: (data: T) => boolean;
  /**
   * 轮询间隔（毫秒），默认 3000
   */
  interval?: number;
  /**
   * 是否在 start 后立即执行第一次请求，默认 true
   */
  immediate?: boolean;
  /**
   * 最大轮询次数，达到后停止；默认不限制
   */
  maxAttempts?: number;
  /**
   * 轮询超时（毫秒），超时后停止；默认不限制
   */
  timeout?: number;
  /**
   * 请求出错时是否继续轮询，默认 true
   */
  continueOnError?: boolean;
  /**
   * 依赖项，变化时自动 restart（正在轮询时，或 autoStart 为 true 时）
   */
  deps?: WatchSource<unknown> | WatchSource<unknown>[];
  /**
   * 组件挂载后自动 start，默认 false
   */
  autoStart?: boolean;
  /**
   * 每次请求成功后的回调
   */
  onSuccess?: (data: T) => void;
  /**
   * 轮询停止时的回调
   */
  onStop?: (data: T | null, reason: PollingStopReason) => void;
  /**
   * 请求出错时的回调
   */
  onError?: (error: unknown) => void;
}

/**
 * 轮询控制器
 */
export interface UsePollingController<T> {
  /** 最近一次请求结果 */
  data: Ref<T | null>;
  /** 最近一次请求错误 */
  error: Ref<unknown>;
  /** 是否正在轮询 */
  isPolling: Ref<boolean>;
  /** 是否有进行中的请求 */
  isRequesting: Ref<boolean>;
  /** 已执行的请求次数 */
  attemptCount: Ref<number>;
  /** 开始轮询 */
  start: () => void;
  /** 手动停止轮询 */
  stop: () => void;
  /** 停止后重新开始轮询 */
  restart: () => void;
}

/**
 * 判断是否为 AbortController 取消导致的错误
 */
function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }

  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}

/**
 * 页面轮询查询状态，支持自定义中止条件、请求取消与依赖自动重启
 * @param options 轮询配置
 * @returns 轮询控制器
 * @example
 * ```ts
 * const taskId = ref('task-1');
 *
 * const { data, isPolling, start, stop } = usePolling({
 *   deps: [taskId],
 *   autoStart: true,
 *   request: async ({ signal }) => {
 *     const res = await fetch(`/api/tasks/${taskId.value}`, { signal });
 *     return res.json();
 *   },
 *   shouldStop: (status) => status.state === 'done' || status.state === 'failed',
 *   interval: 2000,
 * });
 * ```
 */
export function usePolling<T>(
  options: UsePollingOptions<T>
): UsePollingController<T> {
  const data = ref<T | null>(null) as Ref<T | null>;
  const error = ref<unknown>(null);
  const isPolling = ref(false);
  const isRequesting = ref(false);
  const attemptCount = ref(0);

  const interval = Math.max(0, options.interval ?? 3000);
  const immediate = options.immediate ?? true;
  const continueOnError = options.continueOnError ?? true;
  const autoStart = options.autoStart ?? false;

  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;
  let stopped = false;

  /**
   * 清理定时器
   */
  function clearTimers() {
    if (pollTimer !== null) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    if (timeoutTimer !== null) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  }

  /**
   * 取消进行中的请求
   */
  function abortActiveRequest() {
    if (abortController !== null) {
      abortController.abort();
      abortController = null;
    }
    isRequesting.value = false;
  }

  /**
   * 重置轮询内部状态
   * @param notifyStop 是否触发 onStop
   * @param reason 停止原因
   */
  function resetPollingState(
    notifyStop = false,
    reason: PollingStopReason = 'manual'
  ) {
    const wasPolling = isPolling.value;

    stopped = true;
    clearTimers();
    abortActiveRequest();
    isPolling.value = false;

    if (notifyStop && wasPolling) {
      options.onStop?.(data.value, reason);
    }
  }

  /**
   * 停止轮询
   */
  function stop(reason: PollingStopReason = 'manual') {
    if (!isPolling.value && reason === 'manual') {
      return;
    }

    resetPollingState(true, reason);
  }

  /**
   * 调度下一次轮询（等待上一次请求完成后再发起）
   */
  function scheduleNextPoll() {
    if (stopped || !isPolling.value) {
      return;
    }

    pollTimer = setTimeout(() => {
      void executePoll();
    }, interval);
  }

  /**
   * 执行单次轮询请求
   */
  async function executePoll() {
    if (stopped || !isPolling.value) {
      return;
    }

    attemptCount.value += 1;

    if (
      options.maxAttempts !== undefined &&
      attemptCount.value > options.maxAttempts
    ) {
      stop('maxAttempts');
      return;
    }

    abortController = new AbortController();
    const { signal } = abortController;
    isRequesting.value = true;

    try {
      const result = await options.request({ signal });

      if (stopped || signal.aborted) {
        return;
      }

      error.value = null;
      data.value = result;
      options.onSuccess?.(result);

      if (options.shouldStop(result)) {
        stop('condition');
        return;
      }
    } catch (err) {
      if (isAbortError(err) || signal.aborted || stopped) {
        return;
      }

      error.value = err;
      options.onError?.(err);

      if (!continueOnError) {
        stop('error');
        return;
      }
    } finally {
      if (abortController?.signal === signal) {
        abortController = null;
      }
      isRequesting.value = false;
    }

    scheduleNextPoll();
  }

  /**
   * 开始轮询
   * @param notifyPreviousStop 重新开始时是否通知上一次轮询已停止
   */
  function start(notifyPreviousStop = true) {
    resetPollingState(notifyPreviousStop, 'manual');

    stopped = false;
    attemptCount.value = 0;
    error.value = null;
    isPolling.value = true;

    if (options.timeout !== undefined && options.timeout > 0) {
      timeoutTimer = setTimeout(() => {
        if (isPolling.value) {
          stop('timeout');
        }
      }, options.timeout);
    }

    if (immediate) {
      void executePoll();
      return;
    }

    scheduleNextPoll();
  }

  /**
   * 重新开始轮询
   * @param silent 为 true 时不触发 onStop（用于依赖变化自动重启）
   */
  function restart(silent = false) {
    start(!silent);
  }

  if (options.deps !== undefined) {
    watch(
      options.deps,
      () => {
        if (isPolling.value) {
          restart(true);
          return;
        }

        if (autoStart) {
          start(false);
        }
      },
      { deep: true }
    );
  }

  if (autoStart) {
    onMounted(() => {
      start(false);
    });
  }

  onUnmounted(() => {
    stop('manual');
  });

  return {
    data,
    error,
    isPolling,
    isRequesting,
    attemptCount,
    start,
    stop,
    restart
  };
}
