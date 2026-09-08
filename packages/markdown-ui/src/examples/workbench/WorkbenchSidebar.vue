<template>
  <aside class="demo-sidebar" :class="{ 'demo-sidebar--collapsed': collapsed }">
    <div class="demo-sidebar__head">
      <span v-if="!collapsed" class="demo-sidebar__title">示例分类</span>
      <button
        type="button"
        class="demo-sidebar__toggle"
        :title="collapsed ? '展开侧栏' : '收起侧栏'"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '»' : '«' }}
      </button>
    </div>

    <nav v-if="!collapsed" class="demo-sidebar__nav">
      <section
        v-for="group in groupedTabs"
        :key="group.id"
        class="demo-sidebar__group"
      >
        <h3 v-if="group.label" class="demo-sidebar__group-label">
          {{ group.label }}
        </h3>
        <button
          v-for="tab in group.tabs"
          :key="tab.id"
          type="button"
          class="demo-sidebar__item"
          :class="{ 'is-active': tab.id === activeTab }"
          @click="$emit('select', tab.id)"
        >
          <span class="demo-sidebar__item-label">{{ tab.label }}</span>
          <span v-if="tab.description" class="demo-sidebar__item-desc">
            {{ tab.description }}
          </span>
        </button>
      </section>
    </nav>

    <nav v-else class="demo-sidebar__nav demo-sidebar__nav--mini">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="demo-sidebar__mini-item"
        :class="{ 'is-active': tab.id === activeTab }"
        :title="tab.label"
        @click="$emit('select', tab.id)"
      >
        {{ tab.label.slice(0, 2) }}
      </button>
    </nav>
  </aside>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { WorkbenchTab } from './types';

const props = defineProps<{ tabs: WorkbenchTab[]; activeTab: string }>();
defineEmits<{ select: [tabId: string] }>();

const collapsed = ref(false);

/** 常见分类 id 到线上侧栏文案的兜底映射 */
const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  basic: '基础能力',
  diagram: '图表',
  extend: '扩展'
};

/**
 * 按 category 连续分组，保证侧栏结构与线上 Demo 一致。
 */
const groupedTabs = computed(() => {
  const groups: { id: string; label: string; tabs: WorkbenchTab[] }[] = [];
  for (const tab of props.tabs) {
    const id = tab.category ?? '_default';
    const label =
      tab.categoryLabel ||
      (tab.category ? DEFAULT_CATEGORY_LABELS[tab.category] ?? tab.category : '');
    const last = groups[groups.length - 1];
    if (last && last.id === id) {
      last.tabs.push(tab);
    } else {
      groups.push({ id, label, tabs: [tab] });
    }
  }
  return groups;
});
</script>
