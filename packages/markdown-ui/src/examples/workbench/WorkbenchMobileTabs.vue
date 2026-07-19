<template>
  <div class="wb-mobile-tabs" role="tablist" aria-label="Workbench view">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      role="tab"
      :aria-selected="modelValue === item.id"
      :class="{ 'is-active': modelValue === item.id }"
      @click="$emit('update:modelValue', item.id)"
    >{{ item.label }}</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: 'edit' | 'preview' }>();
defineEmits<{ 'update:modelValue': [value: 'edit' | 'preview'] }>();
const items = [
  { id: 'edit' as const, label: '编辑' },
  { id: 'preview' as const, label: '预览' }
];
</script>
