<template>
  <div class="demo-mobile-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="demo-mobile-tabs__item"
      :class="{ 'is-active': tab.id === activeTab }"
      @click="$emit('select', tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script lang="ts" setup>
import type { WorkbenchTab } from './types';

defineProps<{ tabs: WorkbenchTab[]; activeTab: string }>();
defineEmits<{ select: [tabId: string] }>();
</script>
