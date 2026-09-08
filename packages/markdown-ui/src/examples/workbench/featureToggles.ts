import type { MarkdownFeatures } from '../../index';

/**
 * 特性开关在工作台面板中的展示顺序与文案（对齐线上 Demo）。
 */
export interface WorkbenchFeatureToggleMeta {
  key: keyof MarkdownFeatures;
  label: string;
  hint: string;
}

/** 与线上「特性配置」开关一一对应 */
export const WORKBENCH_FEATURE_TOGGLES: WorkbenchFeatureToggleMeta[] = [
  { key: 'gfm', label: 'GFM', hint: 'remark-gfm：表格、任务列表等' },
  { key: 'breaks', label: '换行保留', hint: 'remark-breaks' },
  { key: 'math', label: '数学公式', hint: 'remark-math + rehype-katex' },
  { key: 'mermaid', label: 'Mermaid', hint: 'rehypeMermaid 图表' },
  { key: 'think', label: 'Think', hint: 'remarkThink + MergeThinkRemark' },
  { key: 'customTags', label: '自定义标签', hint: 'custom / other 组件' },
  { key: 'codeHighlight', label: '代码高亮', hint: 'CodeHighLight 组件' },
  { key: 'elTable', label: 'ElTable', hint: 'tableNodeParse + Element Plus 表格' }
];

/**
 * 判断当前特性是否与 Tab 默认配置一致。
 * @param features 当前开关
 * @param defaults Tab 推荐配置；缺省视为已是默认
 */
export function isDefaultWorkbenchFeatures(
  features: MarkdownFeatures,
  defaults?: Partial<MarkdownFeatures>
): boolean {
  if (!defaults) return true;
  return WORKBENCH_FEATURE_TOGGLES.every(
    ({ key }) => features[key] === (defaults[key] ?? features[key])
  );
}
