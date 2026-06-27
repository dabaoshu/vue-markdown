import { renderMermaidASCII, renderMermaidSVG, THEMES } from 'beautiful-mermaid';
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
 * @param svgMarkup 引擎返回的 SVG 字符串
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
 * 判断引擎返回的 SVG 是否为错误占位图。
 * @param svgMarkup 引擎返回的 SVG 字符串
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
 * 将 `beautiful-mermaid` 的 `svg.theme` 名解析为调色板并合并其余 SVG 选项
 * @param props 组件 props
 * @returns 传给 `renderMermaidSVG` 的选项对象
 */
function resolveBeautifulSvgOptions(props: MermaidBlockProps) {
  const svgOptions = { ...(props.beautifulOptions?.svg || {}) };
  const themeName = svgOptions.theme;
  if (themeName && typeof themeName === 'string' && themeName in THEMES) {
    const palette = THEMES[themeName as keyof typeof THEMES];
    return {
      ...palette,
      ...svgOptions,
      theme: undefined
    };
  }
  return svgOptions;
}

/**
 * Mermaid 图表渲染组件
 * @description 将 Mermaid DSL 渲染为 SVG 或 ASCII（可关闭），支持 `mermaid` / `beautiful` 双引擎，并提供加载态、错误态与交互绑定
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
    /** 渲染引擎：`mermaid` 使用官方库；`beautiful` 使用 beautiful-mermaid */
    engine: {
      type: String,
      required: false,
      default: 'mermaid'
    },
    /** Mermaid 原生初始化配置，仅 `engine='mermaid'` 时生效 */
    mermaidConfig: {
      type: Object,
      required: false
    },
    /** beautiful-mermaid 输出与主题配置，仅 `engine='beautiful'` 时生效 */
    beautifulOptions: {
      type: Object,
      required: false
    },
    /** 是否渲染可视输出；为 false 时仅展示源码 */
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
    /** 是否正在流式加载，用于检测 fence 是否闭合 */
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
    /** beautiful 引擎 ASCII 模式下的纯文本输出 */
    const asciiText = ref('');

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
      () => props.id || `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );

    const normalizedCode = computed(() => (props.code || '').trim());
    const currentEngine = computed(() => props.engine || 'mermaid');
    /** 是否使用 beautiful 引擎的 ASCII 输出 */
    const isBeautifulAscii = computed(
      () =>
        currentEngine.value === 'beautiful' &&
        props.beautifulOptions?.output === 'ascii'
    );

    /** 导出等待：流式 / 遮罩 / 宽限期 */
    const isExportLoading = computed(
      () => props.streamLoading || loading.value || streamPending.value
    );

    /**
     * 导出就绪：非 loading 且（无需 SVG / 已有输出 / 错误态 / 空代码）
     */
    const isExportReady = computed(() => {
      if (isExportLoading.value) return false;
      if (props.renderSvg === false) return true;
      if (!normalizedCode.value) return true;
      if (isBeautifulAscii.value) return !!asciiText.value || !!errorMessage.value;
      return !!svgHtml.value || !!errorMessage.value;
    });

    /**
     * 按当前 props 初始化 Mermaid（配置签名未变时跳过）
     * @returns {void}
     */
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
     * 清空可视输出与错误/宽限状态
     * @returns {void}
     */
    const resetVisualState = () => {
      errorMessage.value = '';
      streamPending.value = false;
      svgHtml.value = '';
      asciiText.value = '';
    };

    /**
     * 使用官方 mermaid 引擎渲染 SVG
     * @returns {Promise<void>}
     */
    const renderWithMermaidEngine = async () => {
      ensureMermaidInitialized();
      /** 预解析，避免直接渲染错误图 */
      await mermaid.parse(normalizedCode.value, {
        suppressErrors: false
      });

      const { svg, bindFunctions } = await mermaid.render(
        chartId.value,
        normalizedCode.value
      );

      const safe = sanitizeSvgToHtmlString(svg);
      if (!safe || isMermaidErrorSvg(safe)) {
        throw new Error(props.errorText || defaultErrorText);
      }

      svgHtml.value = safe;
      asciiText.value = '';
      await nextTick();
      if (containerRef.value) {
        bindFunctions?.(containerRef.value);
      }
    };

    /**
     * 使用 beautiful-mermaid 引擎渲染 SVG 或 ASCII
     * @returns {Promise<void>}
     */
    const renderWithBeautifulEngine = async () => {
      if (props.beautifulOptions?.output === 'ascii') {
        asciiText.value = renderMermaidASCII(
          normalizedCode.value,
          props.beautifulOptions?.ascii
        );
        svgHtml.value = '';
        return;
      }

      const svg = renderMermaidSVG(
        normalizedCode.value,
        resolveBeautifulSvgOptions(props)
      );
      const safe = sanitizeSvgToHtmlString(svg);
      if (!safe) {
        throw new Error(props.errorText || defaultErrorText);
      }
      svgHtml.value = safe;
      asciiText.value = '';
      await nextTick();
    };

    /**
     * 执行图表渲染（仅在 `renderSvg` 为真时调用）
     * @returns {Promise<void>}
     */
    const renderDiagram = async () => {
      if (!props.renderSvg) {
        renderTiming.dispose();
        loading.value = false;
        resetVisualState();
        return;
      }

      resetVisualState();
      if (!normalizedCode.value) {
        lastRenderedCacheKey = '';
        return;
      }

      const currentCacheKey =
        props.cacheKey ||
        JSON.stringify({
          code: normalizedCode.value,
          engine: currentEngine.value,
          mermaidConfig: props.mermaidConfig || {},
          beautifulOptions: props.beautifulOptions || {},
          renderSvg: props.renderSvg
        });
      if (
        currentCacheKey === lastRenderedCacheKey &&
        (svgHtml.value || asciiText.value)
      ) {
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
      const delayMs = Math.max(0, props.loadingDelayMs ?? defaultLoadingDelayMs);
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
            if (currentEngine.value === 'beautiful') {
              await renderWithBeautifulEngine();
            } else {
              await renderWithMermaidEngine();
            }

            if (isStaleRender()) return;
            lastRenderedCacheKey = currentCacheKey;
            streamPending.value = false;
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
            errorMessage.value =
              error instanceof Error && error.message
                ? error.message
                : props.errorText || defaultErrorText;
            svgHtml.value = '';
            asciiText.value = '';
            props.onError?.(
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }
      });
    };

    /**
     * 调度图表渲染
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
          void renderDiagram();
        }
      });
    };

    onMounted(() => {
      markCodeChanged();
      scheduleRender(true);
    });

    watch(
      () => [
        props.code,
        props.cacheKey,
        props.engine,
        props.mermaidConfig,
        props.beautifulOptions,
        props.renderSvg
      ],
      () => {
        if (
          props.cacheKey &&
          props.cacheKey === lastRenderedCacheKey &&
          (svgHtml.value || asciiText.value)
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
          {...(isExportLoading.value ? { 'data-export-loading': '' } : {})}
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
          {isBeautifulAscii.value ? (
            <div ref={containerRef} class='mermaid-block__surface' key={chartId.value}>
              <pre>
                <code>{asciiText.value}</code>
              </pre>
            </div>
          ) : (
            <div
              ref={containerRef}
              class='mermaid-block__surface'
              v-html={svgHtml.value}
              key={chartId.value}
            />
          )}
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
