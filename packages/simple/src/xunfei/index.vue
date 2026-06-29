<template>
  <div class="container">
    <h1>大瓦特数字人示例</h1>
  </div>
  <div ref="container"></div>
  <button @click="start">开始</button>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useAvatarSdk } from './composables/useAvatar';
const container = ref<HTMLDivElement | null>(null);
const avatar = useAvatarSdk()
const start = () => {
  avatar.startAvatar();
}
</script>
<style lang="scss">
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>
