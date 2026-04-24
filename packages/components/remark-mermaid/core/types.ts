import type { MermaidConfig } from 'mermaid';

/**
 * Mermaid 渲染组件的通用参数
 * @description 控制图表渲染、状态文案和生命周期回调
 */
export interface MermaidRenderOptions {
  /** Mermaid 运行配置 */
  mermaidConfig?: MermaidConfig;
  /**
   * 是否将 DSL 渲染为 SVG 并挂载到 DOM
   * @description 为 `false` 时仅展示源码（`<pre><code>`），不调用 `mermaid.render`，适合仅需源码预览或降低运行时开销的场景
   * @default true
   */
  renderSvg?: boolean;
  /** 是否显示加载态 */
  showLoading?: boolean;
  /** 加载遮罩文案 */
  loadingText?: string;
  /** 错误遮罩文案 */
  errorText?: string;
  /**
   * 延迟多少毫秒后才显示加载遮罩（渲染很快时可避免一闪）
   * @default 180
   */
  loadingDelayMs?: number;
  /**
   * 加载遮罩出现后的最短展示毫秒数（避免「刚出现就消失」的突兀感）
   * @default 260
   */
  minLoadingMs?: number;
  /**
   * 流式输出错误宽限毫秒数
   * @description 在代码最近发生变更时，暂不展示解析错误，避免半截语法造成误报；超过该时长后再展示真实错误
   * @default 420
   */
  streamErrorGraceMs?: number;
  /**
   * 流式输出宽限期间的提示文案
   * @default 'Streaming diagram...'
   */
  streamPendingText?: string;
  /** 渲染成功回调 */
  onRender?: () => void;
  /** 渲染失败回调 */
  onError?: (error: Error) => void;
}

/**
 * Mermaid 代码块组件参数
 * @description 由 rehype 插件注入 code 内容并渲染为图表
 */
export interface MermaidBlockProps extends MermaidRenderOptions {
  /** Mermaid DSL 源码 */
  code: string;
  /** 渲染缓存键（由 rehype 注入，用于跳过重复渲染） */
  cacheKey?: string;
  /** 图表 id，未传时自动生成 */
  id?: string;
  /** 外层 class */
  className?: string;
}

/**
 * rehype Mermaid 插件参数
 * @description 用于透传组件渲染所需的默认配置
 */
export interface RehypeMermaidOptions {
  /** Mermaid 运行配置 */
  mermaidConfig?: MermaidConfig;
  /** 是否输出 SVG（透传给 `MermaidBlock`，参见 {@link MermaidRenderOptions.renderSvg}） */
  renderSvg?: boolean;
  /** 是否展示加载态 */
  showLoading?: boolean;
  /** 参见 {@link MermaidRenderOptions.loadingDelayMs} */
  loadingDelayMs?: number;
  /** 参见 {@link MermaidRenderOptions.minLoadingMs} */
  minLoadingMs?: number;
  /** 参见 {@link MermaidRenderOptions.streamErrorGraceMs} */
  streamErrorGraceMs?: number;
  /** 参见 {@link MermaidRenderOptions.streamPendingText} */
  streamPendingText?: string;
  /**
   * 是否允许通过代码块 meta 覆盖默认参数
   * @description 例如：```mermaid renderSvg=false loadingDelayMs=0
   * @default true
   */
  enableMetaOptions?: boolean;
  /**
   * Mermaid 代码为空时的回退策略
   * @description
   * - `keep-code`：保留原始 `<pre><code>` 节点
   * - `placeholder`：替换为 `MermaidBlock`，由渲染层决定占位展示
   * @default 'keep-code'
   */
  fallbackMode?: 'keep-code' | 'placeholder';
  /**
   * 是否注入 cacheKey
   * @description 为 `false` 时不向 `MermaidBlock` 透传 `cacheKey`
   * @default true
   */
  injectCacheKey?: boolean;
}

