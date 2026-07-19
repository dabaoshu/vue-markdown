<template>
  <MarkdownWorkbench
    v-model:source="source"
    v-model:active-tab="activeTabModel"
    v-model:features="features"
    :tabs="workbenchTabs"
    :load-tab-content="loadWorkbenchTab"
  />
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { MarkdownWorkbench } from '@nnnb/markdown-ui';
  import type { MarkdownFeatures } from '@nnnb/markdown-ui';
  import { workbenchTabs, type DemoTabId } from './demoData';
  import { getDefaultFeaturesForTab } from './demoFeatureConfig';
  import { loadWorkbenchTab } from './demoMarkdownLoader';

  const props = defineProps<{ activeTab: DemoTabId }>();
  const emit = defineEmits<{
    'update:activeTab': [value: DemoTabId];
  }>();

  const source = ref('');
  const features = ref<MarkdownFeatures>(
    getDefaultFeaturesForTab(props.activeTab)
  );
  const activeTabModel = computed<string>({
    get: () => props.activeTab,
    set: (value) => emit('update:activeTab', value as DemoTabId)
  });

  watch(
    () => props.activeTab,
    (tab) => {
      features.value = getDefaultFeaturesForTab(tab);
    }
  );
</script>
