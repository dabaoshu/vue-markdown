import type { Ref } from 'vue';
import type { MarkdownFeatures } from '../../index';

export interface WorkbenchTab {
  id: string;
  label: string;
  description?: string;
  category?: string;
  defaultFeatures?: Partial<MarkdownFeatures>;
}

export type TabContentLoader = (
  tabId: string,
  signal: AbortSignal
) => Promise<string>;

export interface WorkbenchProps {
  tabs: WorkbenchTab[];
  loadTabContent: TabContentLoader;
}

export interface MarkdownWorkbenchExpose {
  previewTarget: Readonly<Ref<HTMLElement | null>>;
  source: Readonly<Ref<string>>;
  reset(): Promise<void>;
  stopStream(): void;
}
