<script lang="ts" setup>
import { computed, defineAsyncComponent, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DemoLoading from '@/demo/DemoLoading.vue';
import {
  resolveTestTabId,
  TEST_TAB_LIST,
  type TestTabId
} from '@/test/testTabs';

/**
 * 测试用例合并页：顶部分组 Tab 切换各插件 AST+UI 验收页。
 * 旧路径 `/test/remark-*` 由路由重定向到 `?tab=`。
 */
const route = useRoute();
const router = useRouter();

const GfmPage = defineAsyncComponent({
  loader: () => import('@/pages/RemarkGfmTest.vue'),
  loadingComponent: DemoLoading,
  delay: 0
});
const MathPage = defineAsyncComponent({
  loader: () => import('@/pages/RemarkMathTest.vue'),
  loadingComponent: DemoLoading,
  delay: 0
});
const CodePage = defineAsyncComponent({
  loader: () => import('@/pages/CodeHighlightTest.vue'),
  loadingComponent: DemoLoading,
  delay: 0
});
const MermaidPage = defineAsyncComponent({
  loader: () => import('@/pages/RehypeMermaidTest.vue'),
  loadingComponent: DemoLoading,
  delay: 0
});
const HttpPage = defineAsyncComponent({
  loader: () => import('@/pages/RemarkHttpResourceTest.vue'),
  loadingComponent: DemoLoading,
  delay: 0
});
const ThinkPage = defineAsyncComponent({
  loader: () => import('@/pages/RemarkThinkTest.vue'),
  loadingComponent: DemoLoading,
  delay: 0
});

const activeTab = computed({
  get: () => resolveTestTabId(route.query.tab),
  set: (tab: TestTabId) => {
    router.replace({ query: { tab } });
  }
});

watch(
  () => route.query.tab,
  (tab) => {
    const resolved = resolveTestTabId(tab);
    if (tab !== resolved) {
      router.replace({ query: { tab: resolved } });
    }
  },
  { immediate: true }
);

/**
 * 当前 Tab 对应的测试页组件。
 *
 * @param tab 合法 TestTabId
 */
function pageForTab(tab: TestTabId) {
  switch (tab) {
    case 'gfm':
      return GfmPage;
    case 'math':
      return MathPage;
    case 'code':
      return CodePage;
    case 'mermaid':
      return MermaidPage;
    case 'http':
      return HttpPage;
    case 'think':
      return ThinkPage;
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

/**
 * 点选顶部分组。
 *
 * @param id 目标套件
 */
function selectTab(id: TestTabId): void {
  activeTab.value = id;
}
</script>

<template>
  <div class="tests-page">
    <nav class="tests-page__tabs" aria-label="测试套件">
      <button
        v-for="tab in TEST_TAB_LIST"
        :key="tab.id"
        type="button"
        class="tests-page__tab"
        :class="{ 'is-active': tab.id === activeTab }"
        :aria-current="tab.id === activeTab ? 'page' : undefined"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>
    <component :is="pageForTab(activeTab)" />
  </div>
</template>

<style scoped>
.tests-page {
  width: 100%;
}

.tests-page__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tests-page__tab {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.tests-page__tab:hover {
  background: #f8fafc;
  color: #0f172a;
}

.tests-page__tab.is-active {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
  font-weight: 600;
}
</style>
