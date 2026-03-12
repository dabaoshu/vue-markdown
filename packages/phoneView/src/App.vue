<template>
  <div class="phone-view-app">
    <router-view />
  </div>
</template>

<script lang="ts" setup>
/**
 * 根组件：提供手机端容器样式和路由出口
 */
</script>

<style scoped>
.phone-view-app {
  min-height: 100vh;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans',
    'Liberation Sans', sans-serif;
}
</style>

