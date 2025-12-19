<template>
  <div class="container">
    <h1>Vue Markdown Demo</h1>
    <router-view />
  </div>
</template>

<script lang="ts" setup>
  /**
   * 根组件仅负责提供基础布局与路由出口
   */
</script>

<style lang="scss">
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  h1 {
    margin-bottom: 20px;
    color: #333;
    text-align: center;
  }
</style>
