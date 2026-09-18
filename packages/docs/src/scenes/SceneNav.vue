<script lang="ts" setup>
import { computed } from 'vue';
import { sceneList } from './sceneData';
import type { SceneGroup, SceneId, SceneMeta } from './types';

/**
 * 业务场景目录：桌面为左侧分组列表，小屏改为顶部横向芯片。
 */
const props = defineProps<{
  /** 当前选中的场景 id */
  activeId: SceneId;
}>();

const emit = defineEmits<{
  /** 用户点选场景 */
  select: [id: SceneId];
}>();

interface SceneNavGroup {
  key: SceneGroup;
  title: string;
  items: SceneMeta[];
}

/**
 * 把分组枚举收成侧栏标题；新增 SceneGroup 时 default 的 never 会编译失败。
 *
 * @param group 主故事或短场景
 */
function groupTitle(group: SceneGroup): string {
  switch (group) {
    case 'story':
      return '主故事';
    case 'clip':
      return '短场景';
    default: {
      const _exhaustive: never = group;
      return _exhaustive;
    }
  }
}

const groups = computed<SceneNavGroup[]>(() => {
  const keys: SceneGroup[] = ['story', 'clip'];
  return keys.map((key) => ({
    key,
    title: groupTitle(key),
    items: sceneList.filter((scene) => scene.group === key)
  }));
});

/**
 * 通知页面层切换 query.tab。
 *
 * @param id 目标场景
 */
function selectScene(id: SceneId): void {
  if (id === props.activeId) {
    return;
  }
  emit('select', id);
}
</script>

<template>
  <nav class="scene-nav" aria-label="业务场景目录">
    <section
      v-for="group in groups"
      :key="group.key"
      class="scene-nav__group"
    >
      <h2 class="scene-nav__title">{{ group.title }}</h2>
      <ul class="scene-nav__list">
        <li v-for="scene in group.items" :key="scene.id">
          <button
            class="scene-nav__item"
            :class="{ 'is-active': scene.id === activeId }"
            type="button"
            :title="scene.description"
            :aria-current="scene.id === activeId ? 'page' : undefined"
            @click="selectScene(scene.id)"
          >
            <span class="scene-nav__label">{{ scene.label }}</span>
            <span class="scene-nav__desc">{{ scene.description }}</span>
          </button>
        </li>
      </ul>
    </section>
  </nav>
</template>

<style scoped>
.scene-nav {
  position: sticky;
  top: 72px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 100px);
  padding: 12px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.scene-nav__title {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: none;
}

.scene-nav__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.scene-nav__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #475569;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.scene-nav__item:hover {
  background: #f8fafc;
  color: #0f172a;
}

.scene-nav__item.is-active {
  border-color: #bfdbfe;
  color: #2563eb;
  background: #eff6ff;
  font-weight: 600;
}

.scene-nav__label {
  font-size: 13px;
  line-height: 1.4;
}

.scene-nav__desc {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
}

.scene-nav__item.is-active .scene-nav__desc {
  color: #64748b;
}

@media (max-width: 768px) {
  .scene-nav {
    position: relative;
    top: 0;
    max-height: none;
    flex-direction: row;
    align-items: flex-start;
    gap: 16px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 10px 12px;
  }

  .scene-nav__group {
    flex: none;
    min-width: max-content;
  }

  .scene-nav__title {
    margin-bottom: 6px;
  }

  .scene-nav__list {
    flex-direction: row;
    gap: 6px;
  }

  .scene-nav__item {
    width: auto;
    flex-direction: row;
    align-items: center;
    padding: 4px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    background: #f8fafc;
    white-space: nowrap;
  }

  .scene-nav__item.is-active {
    border-color: #bfdbfe;
    color: #2563eb;
    background: #eff6ff;
  }

  .scene-nav__desc {
    display: none;
  }
}
</style>
