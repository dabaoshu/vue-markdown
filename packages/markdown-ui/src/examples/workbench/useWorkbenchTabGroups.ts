import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue';
import {
  findWorkbenchTabGroup,
  groupWorkbenchTabs
} from './groupWorkbenchTabs';
import type { WorkbenchTab } from './types';

/**
 * 示例分类二级展开：默认只打开当前 Tab 所在分组，其它分组收起。
 *
 * @param tabs 示例列表。
 * @param activeTab 当前选中的 Tab id。
 */
export function useWorkbenchTabGroups(
  tabs: MaybeRefOrGetter<WorkbenchTab[]>,
  activeTab: MaybeRefOrGetter<string>
) {
  const groupedTabs = computed(() => groupWorkbenchTabs(toValue(tabs)));
  const openGroupIds = ref<string[]>([]);

  watch(
    [groupedTabs, () => toValue(activeTab)],
    () => {
      const group = findWorkbenchTabGroup(groupedTabs.value, toValue(activeTab));
      if (!group) return;
      if (!openGroupIds.value.includes(group.id)) {
        openGroupIds.value = [...openGroupIds.value, group.id];
      }
    },
    { immediate: true }
  );

  /**
   * 判断一级分类是否展开。
   *
   * @param groupId 分类 id。
   */
  function isGroupOpen(groupId: string): boolean {
    return openGroupIds.value.includes(groupId);
  }

  /**
   * 切换一级分类展开状态；各分组互不影响。
   *
   * @param groupId 分类 id。
   */
  function toggleGroup(groupId: string): void {
    if (openGroupIds.value.includes(groupId)) {
      openGroupIds.value = openGroupIds.value.filter((id) => id !== groupId);
      return;
    }
    openGroupIds.value = [...openGroupIds.value, groupId];
  }

  /**
   * 当前示例是否属于该分类（收起时仍可高亮分类头）。
   *
   * @param groupId 分类 id。
   */
  function isGroupCurrent(groupId: string): boolean {
    const group = groupedTabs.value.find((item) => item.id === groupId);
    return Boolean(group?.tabs.some((tab) => tab.id === toValue(activeTab)));
  }

  return {
    groupedTabs,
    isGroupOpen,
    isGroupCurrent,
    toggleGroup
  };
}
