<template>
  <div class="photo-id-flow">
    <main class="photo-id-flow__content">
      <PhotoFlow />
    </main>
  </div>
</template>

<script lang="ts" setup>
import PhotoFlow from '@/components/photo-id/PhotoFlow.vue';
</script>

<style scoped lang="scss">
.photo-id-flow {
  min-height: 100vh;
  background: #f5f5f5;
}
</style>
