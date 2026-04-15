import type { MermaidConfig } from 'mermaid';

/**
 * Mermaid 渲染组件的通用参数
 * @description 控制图表渲染、状态文案和生命周期回调
 */
export interface MermaidRenderOptions {
  /** Mermaid 运行配置 */
  mermaidConfig?: MermaidConfig;
  /** 加载中文案 */
  loadingText?: string;
  /** 渲染失败文案 */
  errorText?: string;
  /** 是否显示加载态 */
  showLoading?: boolean;
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
  /** 是否展示加载态 */
  showLoading?: boolean;
  /** 加载中文案 */
  loadingText?: string;
  /** 失败文案 */
  errorText?: string;
}

