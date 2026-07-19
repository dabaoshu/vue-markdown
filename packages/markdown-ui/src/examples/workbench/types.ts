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
  previewTarget: HTMLElement | null;
  source: string;
  reset(): Promise<void>;
  stopStream(): void;
}
