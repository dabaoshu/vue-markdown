<template>
  <MarkdownWorkbench
    v-model:source="source"
    v-model:active-tab="activeTabModel"
    v-model:features="features"
    :tabs="tabs"
    :load-tab-content="loadWorkbenchTab"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { MarkdownWorkbench } from '@nnnb/markdown-ui';
import type { MarkdownFeatures } from '@nnnb/markdown-ui';
import type { WorkbenchTab } from '@nnnb/markdown-ui/examples';
import { DEMO_CATEGORIES, workbenchTabs, type DemoTabId } from './demoData';
import { getDefaultFeaturesForTab } from './demoFeatureConfig';
import { loadWorkbenchTab } from './demoMarkdownLoader';

const props = defineProps<{ activeTab: DemoTabId }>();
const emit = defineEmits<{
  'update:activeTab': [value: DemoTabId];
}>();

const source = ref('');
const features = ref<MarkdownFeatures>(getDefaultFeaturesForTab(props.activeTab));
const activeTabModel = computed<string>({
  get: () => props.activeTab,
  set: (value) => emit('update:activeTab', value as DemoTabId)
});

/**
 * 把文档站 Tab 元数据补全为工作台所需的分类名与默认特性。
 */
const tabs = computed<WorkbenchTab[]>(() =>
  workbenchTabs.map((tab) => ({
    ...tab,
    categoryLabel:
      DEMO_CATEGORIES.find((category) => category.id === tab.category)?.label ??
      tab.category,
    defaultFeatures: getDefaultFeaturesForTab(tab.id as DemoTabId)
  }))
);
</script>
