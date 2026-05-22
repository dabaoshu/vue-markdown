import mermaid from 'mermaid';
import {
  computed,
  defineComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue';
import type { MermaidBlockProps } from '../core/types';
import { createRenderTimingController } from '../../componentsUtils/engine';

const defaultLoadingText = 'Loading diagram...';
const defaultErrorText = 'Failed to render diagram';
/** 超过此时长才显示遮罩，避免极快渲染时 DOM 来回切换 */
const defaultLoadingDelayMs = 180;
/** 遮罩出现后的最短展示时间，减轻「刚盖住就撤」的闪烁感 */
const defaultMinLoadingMs = 260;
/** 合并高频代码变更的防抖时长 */
const defaultRenderDebounceMs = 120;
/** 流式输出中暂不报错的宽限时间 */
const defaultStreamErrorGraceMs = 420;
/** 流式输出宽限期内的提示文案 */
const defaultStreamPendingText = 'Streaming diagram...';

/**
 * Mermaid 生成的 SVG 中需整段移除的高风险标签（勿包含 `style` / `foreignObject`，否则图会丢主题或节点文字变成黑块）
 */
const DANGEROUS_SVG_TAGS = ['script', 'iframe', 'object', 'embed'] as const;

/**
 * 解析 SVG、做有限安全清理后序列化为可交给 `v-html` 的字符串
 * @param svgMarkup Mermaid 返回的 SVG 字符串
 * @returns 清理后的 SVG 序列化结果；无效时返回 `null`
 */
function sanitizeSvgToHtmlString(svgMarkup: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return null;

    for (const tag of DANGEROUS_SVG_TAGS) {
      svg.querySelectorAll(tag).forEach((el) => el.remove());
    }

    const traverseAndClean = (node: Element) => {
      for (const attr of [...node.attributes]) {
        if (/^on/i.test(attr.name) || attr.name.startsWith('xmlns:xlink')) {
          node.removeAttribute(attr.name);
        }
      }
      for (const child of Array.from(node.children)) {
        traverseAndClean(child as Element);
      }
    };
    traverseAndClean(svg);

    return new XMLSerializer().serializeToString(svg);
  } catch {
    return null;
  }
}

/**
 * 判断 Mermaid 返回的 SVG 是否为错误占位图。
 * @param svgMarkup Mermaid 返回的 SVG 字符串
 * @returns {boolean} `true` 表示疑似 Mermaid 错误图
 */
function isMermaidErrorSvg(svgMarkup: string): boolean {
  const normalized = svgMarkup.toLowerCase();
  return (
    normalized.includes('class="error-icon"') ||
    normalized.includes("class='error-icon'") ||
    normalized.includes('class="error-text"') ||
    normalized.includes("class='error-text'") ||
    normalized.includes('syntax error')
  );
}

/**
 * Mermaid 图表渲染组件
 * @description 将 Mermaid DSL 渲染为 SVG（可关闭），并提供加载态、错误态与交互绑定
 */
export const MermaidBlock = defineComponent({
  name: 'MermaidBlock',
  props: {
    code: {
      type: String,
      required: true
    },
    cacheKey: {
      type: String,
      required: false
    },
    mermaidConfig: {
      type: Object,
      required: false
    },
    /** 是否渲染 SVG；为 false 时仅展示源码 */
    renderSvg: {
      type: Boolean,
      required: false,
      default: true
    },
    className: {
      type: String,
      required: false,
      default: 'mermaid-block'
    },
    /** 是否正在加载 检测是否闭合 fence */
    streamLoading: {
      type: Boolean,
      required: false,
      default: false
    },
    loadingText: {
      type: String,
      required: false,
      default: defaultLoadingText
    },
    errorText: {
      type: String,
      required: false,
      default: defaultErrorText
    },
    streamPendingText: {
      type: String,
      required: false,
      default: defaultStreamPendingText
    },
    showLoading: {
      type: Boolean,
      required: false,
      default: true
    },
    /** 延迟显示加载遮罩的毫秒数，`0` 表示立即显示 */
    loadingDelayMs: {
      type: Number,
      required: false,
      default: defaultLoadingDelayMs
    },
    /** 遮罩显示后的最短保持毫秒数，`0` 表示渲染结束即关 */
    minLoadingMs: {
      type: Number,
      required: false,
      default: defaultMinLoadingMs
    },
    /** 代码刚变更后的错误宽限时长，避免流式半截语法导致误报 */
    streamErrorGraceMs: {
      type: Number,
      required: false,
      default: defaultStreamErrorGraceMs
    },
    onRender: {
      type: Function,
      required: false
    },
    onError: {
      type: Function,
      required: false
    }
  },
  setup(props: MermaidBlockProps) {
    const containerRef = ref<HTMLElement | null>(null);
    const loading = ref(false);
    const errorMessage = ref('');
    /** 流式输出宽限期内的非错误提示态 */
    const streamPending = ref(false);
    /** 经清理的 SVG 字符串，由 `v-html` 挂载，避免与 Vue patch 争抢同一节点的子节点 */
    const svgHtml = ref('');

    /** 并发渲染代次，用于丢弃过期异步结果 */
    let renderGen = 0;
    let unmounted = false;
    const renderTiming = createRenderTimingController();

    /** 避免在 code 变更时重复执行相同配置的 `initialize` */
    let lastInitSignature = '';
    /** 最近一次成功渲染使用的缓存键 */
    let lastRenderedCacheKey = '';

    /**
     * 标记代码已变更，刷新流式错误宽限计时起点。
     * @returns {void}
     */
    const markCodeChanged = () => {
      renderTiming.markCodeChanged();
    };

    const chartId = computed(
      () => `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );

    const normalizedCode = computed(() => (props.code || '').trim());

    /** 导出等待：流式 / 遮罩 / 宽限期 */
    const isExportLoading = computed(
      () =>
        props.streamLoading ||
        loading.value ||
        streamPending.value
    );

    /**
     * 导出就绪：非 loading 且（无需 SVG / 已有 SVG / 错误态 / 空代码）
     */
    const isExportReady = computed(() => {
      if (isExportLoading.value) return false;
      if (props.renderSvg === false) return true;
      if (!normalizedCode.value) return true;
      return !!svgHtml.value || !!errorMessage.value;
    });

    const ensureMermaidInitialized = () => {
      const merged = {
        /**
         * Mermaid 配置说明：
         * startOnLoad: 关闭自动扫描，改用手动 `render`（适合局部渲染与性能）。
         * securityLevel: `loose` 允许部分 HTML 标签，预览场景常见，需注意 XSS 来源。
         * theme: 预设主题，可被 `mermaidConfig` 覆盖。
         */
        startOnLoad: false,
        securityLevel: 'loose' as const,
        theme: 'default' as const,
        ...(props.mermaidConfig || {})
      };
      const signature = JSON.stringify(merged);
      if (signature === lastInitSignature) return;
      lastInitSignature = signature;
      mermaid.initialize(merged);
    };

    /**
     * 执行 Mermaid 渲染（仅在 `renderSvg` 为真时调用）
     * @returns {Promise<void>}
     */
    const renderMermaid = async () => {
      if (!props.renderSvg) {
        renderTiming.dispose();
        loading.value = false;
        streamPending.value = false;
        errorMessage.value = '';
        svgHtml.value = '';
        return;
      }

      errorMessage.value = '';
      streamPending.value = false;
      if (!normalizedCode.value) {
        svgHtml.value = '';
        lastRenderedCacheKey = '';
        return;
      }

      const currentCacheKey =
        props.cacheKey ||
        JSON.stringify({
          code: normalizedCode.value,
          mermaidConfig: props.mermaidConfig || {},
          renderSvg: props.renderSvg
        });
      if (currentCacheKey === lastRenderedCacheKey && svgHtml.value) {
        return;
      }

      if (!containerRef.value) {
        await nextTick();
      }
      if (!containerRef.value) return;

      const gen = ++renderGen;
      /**
       * 判断当前渲染任务是否已过期。
       * @returns {boolean} `true` 表示任务已失效
       */
      const isStaleRender = () => gen !== renderGen || unmounted;

      const useOverlay = props.showLoading !== false;
      const delayMs = Math.max(
        0,
        props.loadingDelayMs ?? defaultLoadingDelayMs
      );
      const minMs = Math.max(0, props.minLoadingMs ?? defaultMinLoadingMs);
      renderTiming.render({
        debounceMs: 0,
        overlayEnabled: useOverlay,
        loadingDelayMs: delayMs,
        minLoadingMs: minMs,
        setLoading: (value) => {
          loading.value = value;
        },
        isCancelled: isStaleRender,
        task: async () => {
          try {
            ensureMermaidInitialized();
            /**预解析，避免直接渲染错误图 */
            await mermaid.parse(normalizedCode.value, {
              suppressErrors: false
            });

            const { svg, bindFunctions } = await mermaid.render(
              chartId.value,
              normalizedCode.value
            );

            if (isStaleRender()) return;

            const safe = sanitizeSvgToHtmlString(svg);
            if (!safe || isMermaidErrorSvg(safe)) {
              errorMessage.value = props.errorText || defaultErrorText;
              svgHtml.value = '';
              return;
            }

            svgHtml.value = safe;
            lastRenderedCacheKey = currentCacheKey;
            streamPending.value = false;
            await nextTick();
            if (isStaleRender()) return;
            if (containerRef.value) {
              bindFunctions?.(containerRef.value);
            }
            props.onRender?.();
          } catch (error: unknown) {
            if (isStaleRender()) return;
            const graceMs = Math.max(
              0,
              props.streamErrorGraceMs ?? defaultStreamErrorGraceMs
            );
            if (renderTiming.isInStreamGrace(graceMs)) {
              streamPending.value = true;
              renderTiming.scheduleStreamGraceRetry(
                graceMs,
                () => unmounted,
                () => {
                  scheduleRender(true);
                }
              );
              return;
            }
            streamPending.value = false;
            errorMessage.value = props.errorText || defaultErrorText;
            svgHtml.value = '';
            props.onError?.(
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }
      });
    };

    /**
     * 调度 Mermaid 渲染
     * @param immediate 是否立即渲染；`true` 时跳过防抖
     * @returns {void}
     */
    const scheduleRender = (immediate = false) => {
      const debounceMs = Math.max(0, defaultRenderDebounceMs);
      renderTiming.render({
        debounceMs: immediate ? 0 : debounceMs,
        overlayEnabled: false,
        loadingDelayMs: 0,
        minLoadingMs: 0,
        setLoading: () => {},
        isCancelled: () => unmounted,
        task: async () => {
          void renderMermaid();
        }
      });
    };

    onMounted(() => {
      markCodeChanged();
      scheduleRender(true);
    });

    watch(
      () => [props.code, props.cacheKey, props.mermaidConfig, props.renderSvg],
      () => {
        if (
          props.cacheKey &&
          props.cacheKey === lastRenderedCacheKey &&
          !!svgHtml.value
        ) {
          return;
        }
        markCodeChanged();
        scheduleRender();
      },
      { deep: true }
    );

    onBeforeUnmount(() => {
      unmounted = true;
      renderGen += 1;
      renderTiming.dispose();
      loading.value = false;
    });

    return () => {
      // console.log('vue-mermaidBlock', chartId.value, {
      //   renderSvg: props.renderSvg,
      //   showLoading: props.showLoading,
      //   loading: loading.value
      // });
      if (props.renderSvg === false) {
        return (
          <div
            class={`${props.className} mermaid-block--source`}
            data-export-ready='true'
          >
            <pre>
              <code>{normalizedCode.value}</code>
            </pre>
          </div>
        );
      }

      return (
        <div
          class={`${props.className}${
            loading.value && props.showLoading ? ' loading' : ''
          }`}
          style={{ position: 'relative' }}
          {...(isExportLoading.value
            ? { 'data-export-loading': '' }
            : {})}
          data-export-ready={isExportReady.value ? 'true' : 'false'}
        >
          {loading.value && props.showLoading ? (
            <div
              class='mermaid-block__loading-mask'
              style={{
                position: 'absolute',
                inset: '0',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                background: 'rgba(255,255,255,0.65)'
              }}
            >
              {props.loadingText || defaultLoadingText}
            </div>
          ) : null}
          <div
            ref={containerRef}
            class='mermaid-block__surface'
            v-html={svgHtml.value}
            key={chartId.value}
          />
          {streamPending.value ? (
            <div
              class='mermaid-block__stream-pending-mask'
              style={{
                position: 'absolute',
                inset: '0',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                background: 'rgba(255,255,255,0.76)'
              }}
            >
              {props.streamPendingText || defaultStreamPendingText}
            </div>
          ) : null}
          {errorMessage.value ? (
            <div
              class='mermaid-block__error-mask'
              style={{
                position: 'absolute',
                inset: '0',
                zIndex: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                background: 'rgba(255,255,255,0.92)'
              }}
            >
              {errorMessage.value}
            </div>
          ) : null}
        </div>
      );
    };
  }
});
