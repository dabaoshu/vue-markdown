<script lang="ts" setup>
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MarkdownDemoEditor from '@/demo/MarkdownDemoEditor.vue';
import { demoTabList, type DemoTabId } from '@/demo/demoData';

const route = useRoute();
const router = useRouter();

const validTabIds = new Set(demoTabList.map((t) => t.id));

/**
 * 从 URL query 解析 Tab，非法值回退 overview
 * @param raw query.tab 原始值
 */
function resolveTab(raw: unknown): DemoTabId {
  const id = typeof raw === 'string' ? raw : 'overview';
  return validTabIds.has(id as DemoTabId) ? (id as DemoTabId) : 'overview';
}

const activeTab = computed({
  get: () => resolveTab(route.query.tab),
  set: (tab: DemoTabId) => {
    router.replace({ query: { tab } });
  }
});

watch(
  () => route.query.tab,
  (tab) => {
    const resolved = resolveTab(tab);
    if (tab !== resolved) {
      router.replace({ query: { tab: resolved } });
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="demo-page">
    <MarkdownDemoEditor v-model:active-tab="activeTab" />
  </div>
</template>

<style scoped>
.demo-page {
  width: 100%;
}
</style>
