import type {
  AsciiRenderOptions as BeautifulMermaidAsciiRenderOptions,
  RenderOptions as BeautifulMermaidSvgRenderOptions,
  ThemeName as BeautifulMermaidThemeName
} from 'beautiful-mermaid';
import type { MermaidConfig } from 'mermaid';

export type MermaidRenderEngine = 'mermaid' | 'beautiful';
export type BeautifulMermaidOutput = 'svg' | 'ascii';

export interface BeautifulMermaidSvgOptions
  extends Partial<
    Pick<
      BeautifulMermaidSvgRenderOptions,
      | 'bg'
      | 'fg'
      | 'line'
      | 'accent'
      | 'muted'
      | 'surface'
      | 'border'
      | 'font'
      | 'padding'
      | 'nodeSpacing'
      | 'layerSpacing'  
      | 'transparent'
      | 'interactive'
    >
  > {
  /**
   * beautiful-mermaid 内置主题名
   * @description 命中 `THEMES` 时先展开主题颜色，再由显式颜色字段覆盖
   */
  theme?: BeautifulMermaidThemeName | string;
}

export interface BeautifulMermaidAsciiOptions
  extends Partial<
    Pick<
      BeautifulMermaidAsciiRenderOptions,
      'useAscii' | 'paddingX' | 'paddingY' | 'boxBorderPadding'
    >
  > {}

/**
 * beautiful-mermaid 运行配置
 * @description 支持 SVG / ASCII 双输出；SVG 模式下可通过 theme 或显式颜色字段控制主题
 */
export interface BeautifulMermaidOptions {
  /** 输出格式；仅在 `engine='beautiful'` 时生效 */
  output?: BeautifulMermaidOutput;
  /** SVG 输出配置 */
  svg?: BeautifulMermaidSvgOptions;
  /** ASCII 输出配置 */
  ascii?: BeautifulMermaidAsciiOptions;
}

/**
 * Mermaid 引擎参数
 * @description 统一描述默认 mermaid 与 beautiful-mermaid 双引擎配置
 */
export interface MermaidEngineOptions {
  /**
   * Mermaid 渲染引擎
   * @default 'mermaid'
   */
  engine?: MermaidRenderEngine;
  /**
   * Mermaid 原生运行配置
   * @description 仅在 `engine='mermaid'` 时生效
   */
  mermaidConfig?: MermaidConfig;
  /**
   * beautiful-mermaid 配置
   * @description 仅在 `engine='beautiful'` 时生效
   */
  beautifulOptions?: BeautifulMermaidOptions;
}

/**
 * Mermaid 渲染组件的通用参数
 * @description 控制图表渲染、状态文案和生命周期回调
 */
export interface MermaidRenderOptions extends MermaidEngineOptions {
  /**
   * 是否将 DSL 渲染为可视输出并挂载到 DOM
   * @description 为 `false` 时仅展示源码（`<pre><code>`），适合仅需源码预览或降低运行时开销的场景
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
  /** 是否正在加载 检测是否闭合 fence */
  streamLoading?: boolean;
}

/**
 * rehype Mermaid 插件参数
 * @description 用于透传组件渲染所需的默认配置
 */
export interface RehypeMermaidOptions extends MermaidEngineOptions {
  /** 是否输出可视渲染（透传给 `MermaidBlock`） */
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
   * @description 例如：```mermaid engine=beautiful output=ascii
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
