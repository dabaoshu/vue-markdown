<template>
  <div class="demo-mobile-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="demo-mobile-tabs__item"
      :class="{ 'is-active': tab.id === modelValue }"
      @click="emit('update:modelValue', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script lang="ts" setup>
import { demoTabList, type DemoTabId, type DemoTabMeta } from './demoData';

interface Props {
  modelValue: DemoTabId;
  tabs?: DemoTabMeta[];
}

withDefaults(defineProps<Props>(), {
  tabs: () => demoTabList
});

const emit = defineEmits<{
  'update:modelValue': [value: DemoTabId];
}>();
</script>

<style scoped>
.demo-mobile-tabs {
  display: none;
  flex-shrink: 0;
  gap: 6px;
  padding: 8px 10px;
  overflow-x: auto;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  -webkit-overflow-scrolling: touch;
}

.demo-mobile-tabs__item {
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
}

.demo-mobile-tabs__item.is-active {
  color: #2563eb;
  background: #eff6ff;
  border-color: #93c5fd;
}

@media (max-width: 960px) {
  .demo-mobile-tabs {
    display: flex;
  }
}
</style>
