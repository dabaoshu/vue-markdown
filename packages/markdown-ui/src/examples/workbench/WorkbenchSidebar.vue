<template>
  <nav class="wb-sidebar" aria-label="Markdown examples">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="wb-sidebar__item"
      :class="{ 'is-active': tab.id === activeTab }"
      @click="$emit('select', tab.id)"
    >
      <span class="wb-sidebar__label">{{ tab.label }}</span>
      <span v-if="tab.description" class="wb-sidebar__description">{{ tab.description }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import type { WorkbenchTab } from './types';

defineProps<{ tabs: WorkbenchTab[]; activeTab: string }>();
defineEmits<{ select: [tabId: string] }>();
</script>
