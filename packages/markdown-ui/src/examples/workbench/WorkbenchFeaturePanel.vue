<template>
  <details class="wb-features">
    <summary>渲染能力 <span>{{ enabledCount }}/{{ entries.length }}</span></summary>
    <div class="wb-features__grid">
      <label v-for="entry in entries" :key="entry.key">
        <input
          type="checkbox"
          :checked="modelValue[entry.key]"
          @change="toggle(entry.key, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ entry.label }}</span>
      </label>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MarkdownFeatures } from '../../index';

const props = defineProps<{ modelValue: MarkdownFeatures }>();
const emit = defineEmits<{ 'update:modelValue': [value: MarkdownFeatures] }>();

const entries: Array<{ key: keyof MarkdownFeatures; label: string }> = [
  { key: 'gfm', label: 'GFM' },
  { key: 'breaks', label: '换行' },
  { key: 'math', label: '公式' },
  { key: 'mermaid', label: 'Mermaid' },
  { key: 'think', label: 'Think' },
  { key: 'customTags', label: '自定义标签' },
  { key: 'codeHighlight', label: '代码高亮' },
  { key: 'elTable', label: '增强表格' }
];

const enabledCount = computed(
  () => entries.filter(({ key }) => props.modelValue[key]).length
);

function toggle(key: keyof MarkdownFeatures, enabled: boolean): void {
  emit('update:modelValue', { ...props.modelValue, [key]: enabled });
}
</script>
