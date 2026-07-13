<template>
  <div class="demo-tabs-wrap">
    <el-tabs
      :model-value="modelValue"
      type="border-card"
      class="demo-tabs"
      @update:model-value="handleTabChange"
    >
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.id"
        :label="tab.label"
        :name="tab.id"
      />
    </el-tabs>

  </div>
</template>

<script lang="ts" setup>
import { ElTabs, ElTabPane } from 'element-plus';
import type { DemoTabId, DemoTabMeta } from './demoData';

interface Props {
  modelValue: DemoTabId;
  tabs: DemoTabMeta[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: DemoTabId];
}>();

/**
 * 处理 Tab 切换并透传到父组件
 * @param value 选中的 Tab 标识
 */
function handleTabChange(value: string | number) {
  emit('update:modelValue', value as DemoTabId);
}
</script>

<style scoped>
.demo-tabs-wrap {
  flex-shrink: 0;
  padding: 0;
  background: #fafafa;
  border-bottom: 1px solid #e5e5e5;
}

.demo-tabs {
  box-shadow: none;
}

.demo-tabs-hint {
  margin: 0;
  padding: 8px 12px 10px;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

:deep(.demo-tabs .el-tabs__header) {
  margin: 0;
}
</style>
