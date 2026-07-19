<template>
  <section class="markdown-workbench">
    <header class="markdown-workbench__bar">
      <div class="markdown-workbench__identity">
        <span class="markdown-workbench__signal" aria-hidden="true" />
        <div><strong>Markdown Workbench</strong><small>{{ currentTab?.label }}</small></div>
      </div>
      <div class="markdown-workbench__tools">
        <slot name="toolbar-start" />
        <button type="button" @click="playStream">流式回放</button>
        <button type="button" @click="reset">重置</button>
        <slot name="toolbar-end" />
      </div>
    </header>

    <WorkbenchMobileTabs v-model="mobileView" />

    <div class="markdown-workbench__body">
      <WorkbenchSidebar
        :tabs="tabs"
        :active-tab="activeTab"
        @select="activeTab = $event"
      />

      <main class="markdown-workbench__stage">
        <WorkbenchFeaturePanel v-model="features" />
        <p v-if="loadError" class="markdown-workbench__error">{{ loadError }}</p>
        <WorkbenchLoading v-if="tabLoading" />

        <div v-else class="markdown-workbench__panes">
          <section
            class="markdown-workbench__pane markdown-workbench__editor"
            :class="{ 'is-mobile-hidden': mobileView !== 'edit' }"
          >
            <div class="markdown-workbench__pane-title">
              <span>SOURCE · {{ source.length }} chars</span>
              <span class="markdown-workbench__format-tools">
                <button
                  v-for="item in editorToolbar"
                  :key="item.tooltip"
                  type="button"
                  :title="item.tooltip"
                  @click="item.action"
                >{{ item.icon }}</button>
              </span>
            </div>
            <MarkdownCodeMirror
              v-model="source"
              @ready="editorHelper.setEditorView($event.view)"
            />
          </section>

          <section
            class="markdown-workbench__pane markdown-workbench__preview"
            :class="{ 'is-mobile-hidden': mobileView !== 'preview' }"
          >
            <div class="markdown-workbench__pane-title">
              PREVIEW
              <span class="markdown-workbench__preview-actions"><slot name="preview-actions" /></span>
            </div>
            <div ref="previewTarget" class="markdown-workbench__paper">
              <MarkdownRenderer :source="source" :features="features" />
            </div>
          </section>
        </div>
      </main>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, readonly, shallowRef, watch } from 'vue';
import {
  EditorHelper,
  MarkdownCodeMirror,
  MarkdownRenderer,
  createToolbarItems,
  type MarkdownFeatures
} from '../../index';
import WorkbenchFeaturePanel from './WorkbenchFeaturePanel.vue';
import WorkbenchLoading from './WorkbenchLoading.vue';
import WorkbenchMobileTabs from './WorkbenchMobileTabs.vue';
import WorkbenchSidebar from './WorkbenchSidebar.vue';
import { createStreamInputController } from './streamInputController';
import type { MarkdownWorkbenchExpose, WorkbenchProps } from './types';
import './style.scss';

const source = defineModel<string>('source', { required: true });
const activeTab = defineModel<string>('activeTab', { required: true });
const features = defineModel<MarkdownFeatures>('features', { required: true });
const props = defineProps<WorkbenchProps>();

const previewTarget = shallowRef<HTMLElement | null>(null);
const mobileView = shallowRef<'edit' | 'preview'>('edit');
const tabLoading = shallowRef(false);
const loadError = shallowRef<string | null>(null);
const baselineSource = shallowRef(source.value);
const editorHelper = new EditorHelper();
const editorToolbar = createToolbarItems(editorHelper);
const streamController = createStreamInputController();
let loadController: AbortController | undefined;
let previewTimer: ReturnType<typeof setTimeout> | undefined;

const currentTab = computed(() => props.tabs.find((tab) => tab.id === activeTab.value));

async function loadActiveTab(): Promise<void> {
  loadController?.abort();
  streamController.stop();
  const controller = new AbortController();
  loadController = controller;
  tabLoading.value = true;
  loadError.value = null;
  try {
    const next = await props.loadTabContent(activeTab.value, controller.signal);
    if (controller.signal.aborted) return;
    source.value = next;
    baselineSource.value = next;
    const defaults = currentTab.value?.defaultFeatures;
    if (defaults) features.value = { ...features.value, ...defaults };
  } catch (error) {
    if (!controller.signal.aborted) {
      loadError.value = error instanceof Error ? error.message : String(error);
    }
  } finally {
    if (loadController === controller) tabLoading.value = false;
  }
}

function playStream(): void {
  const content = baselineSource.value || source.value;
  streamController.start(content, (value) => {
    source.value = value;
  });
}

function stopStream(): void {
  streamController.stop();
}

async function reset(): Promise<void> {
  await loadActiveTab();
}

watch(activeTab, () => {
  void loadActiveTab();
}, { immediate: true });

onBeforeUnmount(() => {
  loadController?.abort();
  streamController.stop();
  if (previewTimer) clearTimeout(previewTimer);
});

defineExpose<MarkdownWorkbenchExpose>({
  previewTarget,
  source: readonly(source),
  reset,
  stopStream
});
</script>
