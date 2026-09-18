<script lang="ts" setup>
import { computed, defineAsyncComponent, defineComponent, h, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DemoLoading from '@/demo/DemoLoading.vue';
import SceneNav from '@/scenes/SceneNav.vue';
import { resolveSceneId } from '@/scenes/resolveSceneId';
import type { SceneId } from '@/scenes/types';

/**
 * 异步阅读器加载中的占位，文案与功能 Demo 区分开。
 */
const SceneLoading = defineComponent({
  name: 'SceneLoading',
  setup() {
    return () => h(DemoLoading, { message: '正在载入场景…' });
  }
});

/** SceneReader 体积较大，路由进入后再拉 chunk */
const SceneReader = defineAsyncComponent({
  loader: () => import('@/scenes/SceneReader.vue'),
  loadingComponent: SceneLoading,
  delay: 0
});

const route = useRoute();
const router = useRouter();

const activeScene = computed({
  get: () => resolveSceneId(route.query.tab),
  set: (tab: SceneId) => {
    router.replace({ query: { tab } });
  }
});

watch(
  () => route.query.tab,
  (tab) => {
    const resolved = resolveSceneId(tab);
    if (tab !== resolved) {
      router.replace({ query: { tab: resolved } });
    }
  },
  { immediate: true }
);

/**
 * 侧栏点选后写回 query.tab。
 *
 * @param id 目标场景
 */
function onSelectScene(id: SceneId): void {
  activeScene.value = id;
}
</script>

<template>
  <div class="scenes-page">
    <SceneNav :active-id="activeScene" @select="onSelectScene" />
    <div class="scenes-page__reader">
      <SceneReader :scene-id="activeScene" />
    </div>
  </div>
</template>

<style scoped>
.scenes-page {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 16px;
  align-items: start;
  width: 100%;
}

.scenes-page__reader {
  min-width: 0;
}

@media (max-width: 768px) {
  .scenes-page {
    grid-template-columns: 1fr;
  }
}
</style>
