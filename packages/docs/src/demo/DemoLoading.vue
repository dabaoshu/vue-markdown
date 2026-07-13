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

<style scoped>
.demo-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: min(calc(100vh - 140px), 860px);
  padding: 24px;
}

.demo-loading__panel {
  width: min(420px, 100%);
  padding: 28px 24px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.06);
}

.demo-loading__bar {
  height: 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: demo-loading-shimmer 1.2s ease-in-out infinite;
}

.demo-loading__bar--lg {
  width: 72%;
  height: 18px;
}

.demo-loading__bar--sm {
  width: 48%;
  margin-bottom: 18px;
}

.demo-loading__text {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  text-align: center;
}

@keyframes demo-loading-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
