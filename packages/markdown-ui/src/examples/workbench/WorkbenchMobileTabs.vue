<template>
  <div class="demo-mobile-tabs">
    <section
      v-for="group in groupedTabs"
      :key="group.id"
      class="demo-mobile-tabs__group"
    >
      <button
        type="button"
        class="demo-mobile-tabs__group-toggle"
        :class="{ 'is-current': isGroupCurrent(group.id) }"
        :aria-expanded="isGroupOpen(group.id)"
        @click="toggleGroup(group.id)"
      >
        <span>{{ group.label }}</span>
        <span class="demo-mobile-tabs__count">{{ group.tabs.length }}</span>
        <span
          class="demo-mobile-tabs__chevron"
          :class="{ 'is-open': isGroupOpen(group.id) }"
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      <div v-show="isGroupOpen(group.id)" class="demo-mobile-tabs__chips">
        <button
          v-for="tab in group.tabs"
          :key="tab.id"
          type="button"
          class="demo-mobile-tabs__item"
          :class="{ 'is-active': tab.id === activeTab }"
          @click="$emit('select', tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { toRef } from 'vue';
import type { WorkbenchTab } from './types';
import { useWorkbenchTabGroups } from './useWorkbenchTabGroups';

const props = defineProps<{ tabs: WorkbenchTab[]; activeTab: string }>();
defineEmits<{ select: [tabId: string] }>();

const { groupedTabs, isGroupOpen, isGroupCurrent, toggleGroup } =
  useWorkbenchTabGroups(toRef(props, 'tabs'), toRef(props, 'activeTab'));
</script>
