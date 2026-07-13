<template>
  <aside class="demo-sidebar" :class="{ 'demo-sidebar--collapsed': collapsed }">
    <div class="demo-sidebar__head">
      <span v-if="!collapsed" class="demo-sidebar__title">示例分类</span>
      <button
        type="button"
        class="demo-sidebar__toggle"
        :title="collapsed ? '展开侧栏' : '收起侧栏'"
        @click="emit('update:collapsed', !collapsed)"
      >
        {{ collapsed ? '»' : '«' }}
      </button>
    </div>

    <nav v-if="!collapsed" class="demo-sidebar__nav">
      <section
        v-for="group in groupedTabs"
        :key="group.category.id"
        class="demo-sidebar__group"
      >
        <h3 class="demo-sidebar__group-label">{{ group.category.label }}</h3>
        <button
          v-for="tab in group.tabs"
          :key="tab.id"
          type="button"
          class="demo-sidebar__item"
          :class="{ 'is-active': tab.id === modelValue }"
          @click="emit('update:modelValue', tab.id)"
        >
          <span class="demo-sidebar__item-label">{{ tab.label }}</span>
          <span class="demo-sidebar__item-desc">{{ tab.description }}</span>
        </button>
      </section>
    </nav>

    <nav v-else class="demo-sidebar__nav demo-sidebar__nav--mini">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="demo-sidebar__mini-item"
        :class="{ 'is-active': tab.id === modelValue }"
        :title="tab.label"
        @click="emit('update:modelValue', tab.id)"
      >
        {{ tab.label.slice(0, 2) }}
      </button>
    </nav>
  </aside>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import {
  demoTabList,
  getDemoTabsByCategory,
  type DemoTabId,
  type DemoTabMeta
} from './demoData';

interface Props {
  modelValue: DemoTabId;
  tabs?: DemoTabMeta[];
  collapsed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  tabs: () => demoTabList,
  collapsed: false
});

const emit = defineEmits<{
  'update:modelValue': [value: DemoTabId];
  'update:collapsed': [value: boolean];
}>();

const groupedTabs = computed(() => getDemoTabsByCategory());
</script>

<style scoped>
.demo-sidebar {
  flex-shrink: 0;
  width: 220px;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  transition: width 0.2s ease;
}

.demo-sidebar--collapsed {
  width: 52px;
}

.demo-sidebar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}

.demo-sidebar__title {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.demo-sidebar__toggle {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.demo-sidebar__toggle:hover {
  background: #eff6ff;
  color: #2563eb;
}

.demo-sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.demo-sidebar__group + .demo-sidebar__group {
  margin-top: 12px;
}

.demo-sidebar__group-label {
  margin: 0 0 6px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.demo-sidebar__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  margin-bottom: 4px;
  padding: 8px 10px;
  text-align: left;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.demo-sidebar__item:hover {
  background: #fff;
  border-color: #e2e8f0;
}

.demo-sidebar__item.is-active {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.demo-sidebar__item-label {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.demo-sidebar__item.is-active .demo-sidebar__item-label {
  color: #2563eb;
}

.demo-sidebar__item-desc {
  font-size: 11px;
  line-height: 1.4;
  color: #94a3b8;
}

.demo-sidebar__nav--mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 6px;
}

.demo-sidebar__mini-item {
  width: 36px;
  height: 36px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
}

.demo-sidebar__mini-item.is-active {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #2563eb;
}
</style>
