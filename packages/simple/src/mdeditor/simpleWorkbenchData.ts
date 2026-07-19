import type {
  MarkdownFeatures
} from '@nnnb/markdown-ui';
import type {
  TabContentLoader,
  WorkbenchTab
} from '@nnnb/markdown-ui/examples';
import { DEMO_MARKDOWN, demoTabList } from './demoData';

export const simpleWorkbenchTabs: WorkbenchTab[] = demoTabList.map((tab) => ({
  id: tab.id,
  label: tab.label,
  description: tab.description,
  category: tab.category
}));

export const initialSimpleFeatures: MarkdownFeatures = {
  gfm: true,
  breaks: true,
  math: true,
  mermaid: true,
  think: false,
  customTags: true,
  codeHighlight: true,
  elTable: true
};

export const loadSimpleWorkbenchTab: TabContentLoader = async (tabId, signal) => {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  return DEMO_MARKDOWN[tabId as keyof typeof DEMO_MARKDOWN] ?? '';
};
