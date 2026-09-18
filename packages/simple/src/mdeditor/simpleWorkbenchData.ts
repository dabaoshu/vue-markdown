import type {
  MarkdownFeatures
} from '@nnnb/markdown-ui';
import type {
  TabContentLoader,
  WorkbenchTab
} from '@nnnb/markdown-ui/examples';
import { DEMO_MARKDOWN, demoTabList } from './demoData';

/** simple 工作台默认特性：与进入 HTTP 示例时的推荐配置一致 */
export const initialSimpleFeatures: MarkdownFeatures = {
  gfm: true,
  breaks: true,
  math: true,
  mermaid: true,
  think: false,
  customTags: true,
  codeHighlight: true,
  elTable: true,
  httpResource: true
};

/**
 * simple 工作台 Tab。HTTP 示例进入时恢复 simple 默认开关，并保证打标开启。
 *
 * @param tab 演示 Tab 元数据。
 */
function toWorkbenchTab(
  tab: (typeof demoTabList)[number]
): WorkbenchTab {
  const isHttpResource = tab.id === 'httpResource';
  return {
    id: tab.id,
    label: tab.label,
    description: tab.description,
    category: tab.category,
    ...(isHttpResource
      ? {
          defaultFeatures: { ...initialSimpleFeatures }
        }
      : {})
  };
}

export const simpleWorkbenchTabs: WorkbenchTab[] = demoTabList.map(toWorkbenchTab);

export const loadSimpleWorkbenchTab: TabContentLoader = async (tabId, signal) => {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  return DEMO_MARKDOWN[tabId as keyof typeof DEMO_MARKDOWN] ?? '';
};
