<template>
  <div class="feature-panel">
    <div class="feature-panel__head">
      <button
        type="button"
        class="feature-panel__toggle"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <span class="feature-panel__title">特性配置</span>
        <span v-if="!isDefault" class="feature-panel__badge">已自定义</span>
        <span class="feature-panel__chevron" :class="{ 'is-open': expanded }">▾</span>
      </button>
      <button
        type="button"
        class="feature-panel__reset"
        :disabled="isDefault"
        title="恢复为当前示例推荐配置"
        @click="emit('reset')"
      >
        恢复默认
      </button>
    </div>

    <div v-show="expanded" class="feature-panel__body">
      <label
        v-for="item in DEMO_FEATURE_TOGGLES"
        :key="item.key"
        class="feature-switch"
        :title="item.hint"
      >
        <ElSwitch
          :model-value="modelValue[item.key]"
          size="small"
          @update:model-value="(value: boolean) => updateFeature(item.key, value)"
        />
        <span class="feature-switch__label">{{ item.label }}</span>
      </label>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { ElSwitch } from 'element-plus';
import {
  DEMO_FEATURE_TOGGLES,
  type DemoMarkdownFeatures
} from './demoFeatureConfig';

const props = defineProps<{
  modelValue: DemoMarkdownFeatures;
  isDefault: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: DemoMarkdownFeatures];
  reset: [];
}>();

const expanded = ref(true);

/**
 * 更新单个特性开关。
 * @param key 特性键
 * @param value 开关值
 */
function updateFeature(key: keyof DemoMarkdownFeatures, value: boolean) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  });
}
</script>

<style scoped>
.feature-panel {
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.feature-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 14px;
}

.feature-panel__toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

.feature-panel__title {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.feature-panel__badge {
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  color: #b45309;
  background: #fffbeb;
  border-radius: 999px;
}

.feature-panel__chevron {
  font-size: 12px;
  color: #94a3b8;
  transition: transform 0.15s;
}

.feature-panel__chevron.is-open {
  transform: rotate(180deg);
}

.feature-panel__reset {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
}

.feature-panel__reset:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.feature-panel__body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 0 14px 10px;
}

.feature-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.feature-switch__label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}
</style>
