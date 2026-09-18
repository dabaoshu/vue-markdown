import type { WorkbenchTab } from './types';

/** 常见分类 id 到侧栏文案的兜底映射 */
const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  basic: '基础能力',
  diagram: '图表',
  extend: '扩展'
};

/**
 * 工作台侧栏 / 移动端的一级分类。
 */
export interface WorkbenchTabGroup {
  id: string;
  label: string;
  tabs: WorkbenchTab[];
}

/**
 * 按 category 连续分组，供二级展开导航使用。
 *
 * @param tabs 工作台示例列表。
 * @returns 保持原顺序的分类数组。
 */
export function groupWorkbenchTabs(tabs: WorkbenchTab[]): WorkbenchTabGroup[] {
  const groups: WorkbenchTabGroup[] = [];
  for (const tab of tabs) {
    const id = tab.category ?? '_default';
    const label =
      tab.categoryLabel ||
      (tab.category ? DEFAULT_CATEGORY_LABELS[tab.category] ?? tab.category : '其他');
    const last = groups[groups.length - 1];
    if (last && last.id === id) {
      last.tabs.push(tab);
    } else {
      groups.push({ id, label, tabs: [tab] });
    }
  }
  return groups;
}

/**
 * 定位当前示例所属的一级分类。
 *
 * @param groups 已分组的示例。
 * @param activeTab 当前 Tab id。
 * @returns 命中的分组；未命中时为 undefined。
 */
export function findWorkbenchTabGroup(
  groups: WorkbenchTabGroup[],
  activeTab: string
): WorkbenchTabGroup | undefined {
  return groups.find((group) => group.tabs.some((tab) => tab.id === activeTab));
}
