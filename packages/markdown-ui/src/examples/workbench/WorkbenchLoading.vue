<template>
  <div class="wb-loading" role="status">
    <span class="wb-loading__mark" aria-hidden="true" />
    <span>{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ message?: string }>(), { message: '正在装载示例' });
</script>
