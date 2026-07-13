import type { DemoTabId } from './demoData';

/**
 * Demo 预览可开关的 Markdown 特性集合。
 */
export interface DemoMarkdownFeatures {
  /** remark-gfm */
  gfm: boolean;
  /** remark-breaks */
  breaks: boolean;
  /** remark-math + rehype-katex */
  math: boolean;
  /** rehypeMermaid */
  mermaid: boolean;
  /** remarkThink + MergeThinkRemark */
  think: boolean;
  /** custom / other 自定义标签 */
  customTags: boolean;
  /** CodeHighLight 代码块组件 */
  codeHighlight: boolean;
  /** tableNodeParse + ElTable */
  elTable: boolean;
}

/**
 * 特性开关 UI 元数据。
 */
export interface DemoFeatureToggleMeta {
  key: keyof DemoMarkdownFeatures;
  label: string;
  hint: string;
}

/** 全部特性开关定义（顺序即 UI 展示顺序） */
export const DEMO_FEATURE_TOGGLES: DemoFeatureToggleMeta[] = [
  { key: 'gfm', label: 'GFM', hint: 'remark-gfm：表格、任务列表等' },
  { key: 'breaks', label: '换行保留', hint: 'remark-breaks' },
  { key: 'math', label: '数学公式', hint: 'remark-math + rehype-katex' },
  { key: 'mermaid', label: 'Mermaid', hint: 'rehypeMermaid 图表' },
  { key: 'think', label: 'Think', hint: 'remarkThink + MergeThinkRemark' },
  { key: 'customTags', label: '自定义标签', hint: 'custom / other 组件' },
  { key: 'codeHighlight', label: '代码高亮', hint: 'CodeHighLight 组件' },
  { key: 'elTable', label: 'ElTable', hint: 'tableNodeParse + Element Plus 表格' }
];

/** 全量开启（总览等场景） */
export const ALL_FEATURES_ON: DemoMarkdownFeatures = {
  gfm: true,
  breaks: true,
  math: true,
  mermaid: true,
  think: true,
  customTags: true,
  codeHighlight: true,
  elTable: true
};

/**
 * 各 Tab 推荐的默认特性组合。
 */
const TAB_FEATURE_DEFAULTS: Record<DemoTabId, DemoMarkdownFeatures> = {
  overview: { ...ALL_FEATURES_ON },
  gfm: {
    gfm: true,
    breaks: true,
    math: false,
    mermaid: false,
    think: false,
    customTags: false,
    codeHighlight: false,
    elTable: false
  },
  math: {
    gfm: false,
    breaks: true,
    math: true,
    mermaid: false,
    think: false,
    customTags: false,
    codeHighlight: false,
    elTable: false
  },
  code: {
    gfm: false,
    breaks: true,
    math: false,
    mermaid: false,
    think: false,
    customTags: false,
    codeHighlight: true,
    elTable: false
  },
  diagrams: {
    gfm: true,
    breaks: true,
    math: false,
    mermaid: true,
    think: false,
    customTags: false,
    codeHighlight: false,
    elTable: false
  },
  mermaid: {
    gfm: true,
    breaks: true,
    math: false,
    mermaid: true,
    think: false,
    customTags: false,
    codeHighlight: false,
    elTable: false
  },
  mermaidRoundTrip: {
    gfm: false,
    breaks: true,
    math: false,
    mermaid: true,
    think: false,
    customTags: false,
    codeHighlight: false,
    elTable: false
  },
  table: {
    gfm: true,
    breaks: true,
    math: false,
    mermaid: false,
    think: false,
    customTags: false,
    codeHighlight: false,
    elTable: true
  },
  think: {
    gfm: false,
    breaks: true,
    math: false,
    mermaid: false,
    think: true,
    customTags: true,
    codeHighlight: false,
    elTable: false
  },
  form: {
    gfm: true,
    breaks: true,
    math: false,
    mermaid: false,
    think: false,
    customTags: false,
    codeHighlight: false,
    elTable: false
  }
};

/**
 * 获取指定 Tab 的默认特性配置（返回副本，避免共享引用）。
 * @param tabId Tab 标识
 */
export function getDefaultFeaturesForTab(tabId: DemoTabId): DemoMarkdownFeatures {
  return { ...TAB_FEATURE_DEFAULTS[tabId] };
}

/**
 * 判断当前特性是否与 Tab 默认配置一致。
 * @param tabId Tab 标识
 * @param features 当前特性
 */
export function isDefaultFeaturesForTab(
  tabId: DemoTabId,
  features: DemoMarkdownFeatures
): boolean {
  const defaults = TAB_FEATURE_DEFAULTS[tabId];
  return DEMO_FEATURE_TOGGLES.every(({ key }) => features[key] === defaults[key]);
}
