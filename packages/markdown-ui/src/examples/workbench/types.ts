import type { MarkdownFeatures } from '../../index';

/**
 * 工作台侧栏 / 移动端 Tab 的案例元数据。
 */
export interface WorkbenchTab {
  id: string;
  label: string;
  description?: string;
  /** 分类标识，相同值会分到同一侧栏分组 */
  category?: string;
  /** 侧栏分组展示名；缺省时按 category 映射 */
  categoryLabel?: string;
  /** 进入该 Tab 时恢复的特性开关；缺省则不改当前特性 */
  defaultFeatures?: Partial<MarkdownFeatures>;
}

/**
 * 按 Tab id 异步加载 Markdown 正文。
 */
export type TabContentLoader = (
  tabId: string,
  signal: AbortSignal
) => Promise<string>;

/**
 * MarkdownWorkbench 除 v-model 外的入参。
 */
export interface WorkbenchProps {
  tabs: WorkbenchTab[];
  loadTabContent: TabContentLoader;
}

/**
 * 工作台对外暴露的只读能力。
 */
export interface MarkdownWorkbenchExpose {
  previewTarget: HTMLElement | null;
  source: string;
  reset(): Promise<void>;
  stopStream(): void;
}

/** 编辑区 / 预览区布局模式，与线上 Demo 工具栏一致 */
export type WorkbenchViewMode = 'split' | 'editor' | 'preview';
