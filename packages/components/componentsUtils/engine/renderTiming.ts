import debounce from 'lodash/debounce';

/**
 * 渲染时序控制器选项。
 */
export interface OverlayStartOptions {
  /** 是否启用加载遮罩 */
  enabled: boolean;
  /** 延迟显示时长（毫秒） */
  delayMs: number;
  /** 遮罩显示回调 */
  onShow: () => void;
  /** 是否已取消（如组件卸载或渲染代次失效） */
  isCancelled: () => boolean;
}

/**
 * 渲染收尾控制选项。
 */
export interface OverlayFinishOptions {
  /** 是否启用加载遮罩 */
  enabled: boolean;
  /** 遮罩最短展示时长（毫秒） */
  minMs: number;
  /** 遮罩隐藏回调 */
  onHide: () => void;
  /** 是否已取消（如组件卸载或渲染代次失效） */
  isCancelled: () => boolean;
}

/**
 * 单次渲染任务参数。
 */
export interface RenderTaskOptions {
  /** 防抖时长（毫秒） */
  debounceMs: number;
  /** 是否启用加载遮罩 */
  overlayEnabled: boolean;
  /** 延迟显示遮罩时长（毫秒） */
  loadingDelayMs: number;
  /** 遮罩最短展示时长（毫秒） */
  minLoadingMs: number;
  /** 设置加载态 */
  setLoading: (loading: boolean) => void;
  /** 任务是否已失效（组件卸载/代次变化） */
  isCancelled: () => boolean;
  /** 真正的渲染任务 */
  task: () => Promise<void>;
}

/**
 * 渲染时序控制器。
 * @description 初始化后仅需调用 `render()` 即可完成「防抖 + 加载遮罩时序」控制。
 */
export class RenderTimingController {
  private delayTimer: ReturnType<typeof setTimeout> | null = null;
  private minTimer: ReturnType<typeof setTimeout> | null = null;
  private streamGraceRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private debouncedTask: ReturnType<typeof debounce<() => void>> | null = null;
  private lastChangedAt = 0;

  /**
   * 清理防抖任务。
   * @returns {void}
   */
  private clearDebounce() {
    if (this.debouncedTask) {
      this.debouncedTask.cancel();
      this.debouncedTask = null;
    }
  }

  /**
   * 清理遮罩相关定时器。
   * @returns {void}
   */
  private clearOverlayTimers() {
    if (this.delayTimer) {
      clearTimeout(this.delayTimer);
      this.delayTimer = null;
    }
    if (this.minTimer) {
      clearTimeout(this.minTimer);
      this.minTimer = null;
    }
  }

  /**
   * 清理流式宽限重试定时器。
   * @returns {void}
   */
  private clearStreamGraceRetryTimer() {
    if (!this.streamGraceRetryTimer) return;
    clearTimeout(this.streamGraceRetryTimer);
    this.streamGraceRetryTimer = null;
  }

  /**
   * 统一执行渲染任务（防抖 + 遮罩时序）。
   * @param options 渲染任务参数
   * @returns {void}
   */
  render(options: RenderTaskOptions) {
    this.clearStreamGraceRetryTimer();
    this.clearDebounce();
    const waitMs = Math.max(0, options.debounceMs);
    const runTask = async () => {
      this.clearOverlayTimers();
      options.setLoading(false);
      let overlayShownAt = 0;

      if (options.overlayEnabled) {
        const delayMs = Math.max(0, options.loadingDelayMs);
        if (delayMs <= 0) {
          if (!options.isCancelled()) {
            options.setLoading(true);
            overlayShownAt = Date.now();
          }
        } else {
          this.delayTimer = setTimeout(() => {
            this.delayTimer = null;
            if (options.isCancelled()) return;
            options.setLoading(true);
            overlayShownAt = Date.now();
          }, delayMs);
        }
      }

      try {
        await options.task();
      } finally {
        if (this.delayTimer) {
          clearTimeout(this.delayTimer);
          this.delayTimer = null;
        }
        if (options.isCancelled()) return;
        if (!options.overlayEnabled) {
          options.setLoading(false);
          return;
        }
        if (!overlayShownAt) return;

        const minMs = Math.max(0, options.minLoadingMs);
        const elapsed = Date.now() - overlayShownAt;
        const rest = Math.max(0, minMs - elapsed);
        if (rest > 0) {
          await new Promise<void>((resolve) => {
            this.minTimer = setTimeout(() => {
              this.minTimer = null;
              resolve();
            }, rest);
          });
        }
        if (options.isCancelled()) return;
        options.setLoading(false);
      }
    };

    if (waitMs <= 0) {
      void runTask();
      return;
    }

    this.debouncedTask = debounce(() => {
      this.debouncedTask = null;
      void runTask();
    }, waitMs);
    this.debouncedTask();
  }

  /**
   * 标记最新一次输入变更时间。
   * @returns {void}
   */
  markCodeChanged() {
    this.lastChangedAt = Date.now();
  }

  /**
   * 判断是否处于流式错误宽限期。
   * @param graceMs 宽限时长（毫秒）
   * @returns {boolean}
   */
  isInStreamGrace(graceMs: number) {
    return Date.now() - this.lastChangedAt < Math.max(0, graceMs);
  }

  /**
   * 计算当前流式错误宽限剩余时长。
   * @param graceMs 宽限时长（毫秒）
   * @returns {number} 剩余毫秒数（最小为 0）
   */
  getStreamGraceRemainingMs(graceMs: number) {
    const safeGraceMs = Math.max(0, graceMs);
    const elapsedMs = Date.now() - this.lastChangedAt;
    return Math.max(0, safeGraceMs - elapsedMs);
  }

  /**
   * 在流式错误宽限期结束后触发一次重试回调。
   * @param graceMs 宽限时长（毫秒）
   * @param isCancelled 外部取消条件（如组件卸载）
   * @param onRetry 宽限到期后执行的重试逻辑
   * @returns {void}
   */
  scheduleStreamGraceRetry(
    graceMs: number,
    isCancelled: () => boolean,
    onRetry: () => void
  ) {
    this.clearStreamGraceRetryTimer();
    const remainingMs = this.getStreamGraceRemainingMs(graceMs);
    this.streamGraceRetryTimer = setTimeout(() => {
      this.streamGraceRetryTimer = null;
      if (isCancelled()) return;
      onRetry();
    }, remainingMs);
  }

  /**
   * 销毁控制器并清理全部任务。
   * @returns {void}
   */
  dispose() {
    this.clearDebounce();
    this.clearOverlayTimers();
    this.clearStreamGraceRetryTimer();
  }
}

/**
 * 创建渲染时序控制器实例（兼容工厂调用方式）。
 * @returns {RenderTimingController}
 */
export function createRenderTimingController() {
  return new RenderTimingController();
}
