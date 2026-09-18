<template>
  <aside class="demo-sidebar" :class="{ 'demo-sidebar--collapsed': collapsed }">
    <div class="demo-sidebar__head">
      <span v-if="!collapsed" class="demo-sidebar__title">示例分类</span>
      <button
        type="button"
        class="demo-sidebar__toggle"
        :title="collapsed ? '展开侧栏' : '收起侧栏'"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '»' : '«' }}
      </button>
    </div>

    <nav v-if="!collapsed" class="demo-sidebar__nav">
      <section
        v-for="group in groupedTabs"
        :key="group.id"
        class="demo-sidebar__group"
        :class="{ 'is-open': isGroupOpen(group.id) }"
      >
        <button
          type="button"
          class="demo-sidebar__group-toggle"
          :class="{ 'is-current': isGroupCurrent(group.id) }"
          :aria-expanded="isGroupOpen(group.id)"
          @click="toggleGroup(group.id)"
        >
          <span class="demo-sidebar__group-label">{{ group.label }}</span>
          <span class="demo-sidebar__group-count">{{ group.tabs.length }}</span>
          <span
            class="demo-sidebar__group-chevron"
            :class="{ 'is-open': isGroupOpen(group.id) }"
            aria-hidden="true"
          >
            ▾
          </span>
        </button>
        <div v-show="isGroupOpen(group.id)" class="demo-sidebar__group-items">
          <button
            v-for="tab in group.tabs"
            :key="tab.id"
            type="button"
            class="demo-sidebar__item"
            :class="{ 'is-active': tab.id === activeTab }"
            @click="$emit('select', tab.id)"
          >
            <span class="demo-sidebar__item-label">{{ tab.label }}</span>
            <span v-if="tab.description" class="demo-sidebar__item-desc">
              {{ tab.description }}
            </span>
          </button>
        </div>
      </section>
    </nav>

    <nav v-else class="demo-sidebar__nav demo-sidebar__nav--mini">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="demo-sidebar__mini-item"
        :class="{ 'is-active': tab.id === activeTab }"
        :title="tab.label"
        @click="$emit('select', tab.id)"
      >
        {{ tab.label.slice(0, 2) }}
      </button>
    </nav>
  </aside>
</template>

<script lang="ts" setup>
import { ref, toRef } from 'vue';
import type { WorkbenchTab } from './types';
import { useWorkbenchTabGroups } from './useWorkbenchTabGroups';

const props = defineProps<{ tabs: WorkbenchTab[]; activeTab: string }>();
defineEmits<{ select: [tabId: string] }>();

const collapsed = ref(false);
const { groupedTabs, isGroupOpen, isGroupCurrent, toggleGroup } =
  useWorkbenchTabGroups(toRef(props, 'tabs'), toRef(props, 'activeTab'));
</script>
