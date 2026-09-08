<template>
  <div class="demo-loading" role="status" aria-live="polite">
    <div class="demo-loading__panel">
      <div class="demo-loading__bar demo-loading__bar--lg" />
      <div class="demo-loading__bar" />
      <div class="demo-loading__bar demo-loading__bar--sm" />
      <p class="demo-loading__text">{{ message }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    /** 加载提示文案 */
    message?: string;
  }>(),
  {
    message: '正在加载 Demo 组件…'
  }
);
</script>
