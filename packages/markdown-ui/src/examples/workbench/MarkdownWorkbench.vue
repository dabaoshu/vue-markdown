<template>
  <div class="demo-workbench" :class="{ 'demo-workbench--sample': sampleOpen }">
    <header class="demo-workbench__header">
      <div class="demo-workbench__meta">
        <h2 class="demo-workbench__title">{{ currentTab?.label ?? 'Demo' }}</h2>
        <p class="demo-workbench__desc">{{ currentTab?.description }}</p>
      </div>
      <div class="demo-workbench__status">
        <span v-if="isStreaming" class="status-badge status-badge--streaming">
          流式输出中
        </span>
        <span v-if="isDirty" class="status-badge status-badge--dirty">已修改</span>
        <span class="status-badge">{{ lineCount }} 行 · {{ charCount }} 字</span>
      </div>
    </header>

    <div class="demo-workbench__toolbar">
      <div v-if="hasToolbarStart" class="toolbar-group toolbar-group--slot">
        <slot name="toolbar-start" />
      </div>

      <div class="toolbar-group">
        <span class="toolbar-group__label">视图</span>
        <div class="view-switch">
          <button
            v-for="mode in viewModes"
            :key="mode.id"
            type="button"
            class="view-switch__btn"
            :class="{ 'is-active': viewMode === mode.id }"
            :title="mode.title"
            @click="viewMode = mode.id"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <span class="toolbar-group__label">编辑</span>
        <button type="button" class="tool-btn" title="重置为当前示例" @click="reset">
          重置
        </button>
        <button type="button" class="tool-btn" title="复制 Markdown 源码" @click="copyMarkdown">
          {{ copyDone ? '已复制' : '复制 MD' }}
        </button>
        <div class="format-btns">
          <button
            v-for="item in editorToolbar"
            :key="item.tooltip"
            type="button"
            class="format-btn"
            :title="item.tooltip"
            @click="item.action()"
          >
            {{ item.icon }}
          </button>
        </div>
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <span class="toolbar-group__label">测试</span>
        <button
          type="button"
          class="tool-btn tool-btn--stream"
          :class="{ 'is-active': isStreaming }"
          :disabled="isStreaming"
          title="以当前编辑器内容模拟逐块流式写入，观察预览实时渲染"
          @click="playStream"
        >
          流式输入
        </button>
        <button
          type="button"
          class="tool-btn"
          :disabled="!isStreaming"
          title="停止流式输出"
          @click="stopStream"
        >
          停止
        </button>
      </div>

      <div v-if="hasToolbarEnd" class="toolbar-group toolbar-group--slot">
        <slot name="toolbar-end" />
      </div>
    </div>

    <WorkbenchFeaturePanel
      v-model="features"
      v-model:sample-open="sampleOpen"
      :is-default="isFeatureDefault"
      @reset="resetFeatureConfig"
    />

    <div v-show="!sampleOpen" class="demo-workbench__body">
      <WorkbenchSidebar
        :tabs="tabs"
        :active-tab="activeTab"
        @select="handleTabChange"
      />

      <div class="demo-workbench__main">
        <WorkbenchMobileTabs
          :tabs="tabs"
          :active-tab="activeTab"
          @select="handleTabChange"
        />

        <p v-if="loadError" class="demo-workbench__error">{{ loadError }}</p>

        <div
          class="demo-workbench__workspace"
          :class="[`demo-workbench__workspace--${viewMode}`]"
        >
          <section v-show="viewMode !== 'preview'" class="pane pane--editor">
            <div class="pane__head">
              <span class="pane__label">Markdown 源码</span>
              <span class="pane__hint">Tab 缩进 · Ctrl+B/I 快捷键</span>
            </div>
            <div class="pane__body editor-codemirror" dir="ltr">
              <MarkdownCodeMirror
                v-model="source"
                @ready="handleEditorReady"
              />
            </div>
          </section>

          <section v-show="viewMode !== 'editor'" class="pane pane--preview">
            <div class="pane__head">
              <span class="pane__label">实时预览</span>
              <span class="pane__hint">{{ previewHint }}</span>
                <span class="pane__preview-actions">
                  <slot name="preview-actions" />
                </span>
            </div>
            <div class="pane__body preview-scroll">
              <div v-if="tabLoading" class="preview-content preview-content--loading">
                <WorkbenchLoading message="正在载入示例…" />
              </div>
              <div
                v-else
                ref="previewTarget"
                class="preview-content"
              >
                <MarkdownRenderer :source="previewCode" :features="features" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, readonly, ref, shallowRef, useSlots, watch } from 'vue';
import { EditorView } from '@codemirror/view';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  DEFAULT_MARKDOWN_FEATURES,
  EditorHelper,
  MarkdownCodeMirror,
  MarkdownRenderer,
  createShortcuts,
  createToolbarItems,
  type MarkdownFeatures
} from '../../index';
import WorkbenchFeaturePanel from './WorkbenchFeaturePanel.vue';
import WorkbenchLoading from './WorkbenchLoading.vue';
import WorkbenchMobileTabs from './WorkbenchMobileTabs.vue';
import WorkbenchSidebar from './WorkbenchSidebar.vue';
import { isDefaultWorkbenchFeatures } from './featureToggles';
import {
  createStreamInputController,
  type StreamInputController
} from './streamInputController';
import type { WorkbenchProps, WorkbenchViewMode } from './types';
import './style.scss';

const source = defineModel<string>('source', { required: true });
const activeTab = defineModel<string>('activeTab', { required: true });
const features = defineModel<MarkdownFeatures>('features', { required: true });
const props = defineProps<WorkbenchProps>();

const previewTarget = shallowRef<HTMLElement | null>(null);
const viewMode = ref<WorkbenchViewMode>('split');
const tabLoading = shallowRef(false);
const loadError = shallowRef<string | null>(null);
const baselineSource = shallowRef(source.value);
const previewCode = ref(source.value);
const previewPending = ref(false);
const copyDone = ref(false);
const isStreaming = ref(false);
const sampleOpen = ref(false);
const editorView = shallowRef<EditorView>();
const editorHelper = new EditorHelper();
const editorToolbar = createToolbarItems(editorHelper);
const shortcuts = createShortcuts(editorHelper);
const slots = useSlots();
const hasToolbarStart = computed(() => Boolean(slots['toolbar-start']));
const hasToolbarEnd = computed(() => Boolean(slots['toolbar-end']));

let streamController: StreamInputController | undefined;
let loadController: AbortController | undefined;
let previewDebounceTimer: ReturnType<typeof setTimeout> | undefined;
let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

const viewModes: { id: WorkbenchViewMode; label: string; title: string }[] = [
  { id: 'split', label: '分栏', title: '编辑与预览并排' },
  { id: 'editor', label: '编辑', title: '只显示编辑器' },
  { id: 'preview', label: '预览', title: '只显示预览' }
];

const currentTab = computed(() => props.tabs.find((tab) => tab.id === activeTab.value));
const isDirty = computed(() => source.value !== baselineSource.value);
const lineCount = computed(() => source.value.split('\n').length);
const charCount = computed(() => source.value.length);
const isFeatureDefault = computed(() =>
  isDefaultWorkbenchFeatures(features.value, currentTab.value?.defaultFeatures)
);
const previewHint = computed(() => {
  if (isStreaming.value) return '流式实时预览';
  if (previewPending.value) return '渲染中…';
  if (isFeatureDefault.value) return '与当前示例推荐配置一致';
  return '自定义特性配置预览';
});

/**
 * 恢复当前 Tab 的推荐特性配置。
 */
function resetFeatureConfig(): void {
  const defaults = currentTab.value?.defaultFeatures;
  if (!defaults) return;
  features.value = { ...DEFAULT_MARKDOWN_FEATURES, ...defaults };
}

/**
 * 将编辑器滚动到文档末尾，便于观察流式追加。
 */
function scrollEditorToEnd(): void {
  const view = editorView.value;
  if (!view) return;
  view.dispatch({
    effects: EditorView.scrollIntoView(view.state.doc.length, { y: 'nearest' })
  });
}

/**
 * 更新预览区 Markdown：流式立即同步，普通编辑防抖。
 * @param value 编辑器最新内容
 * @param immediate 是否跳过防抖
 */
function applyPreviewUpdate(value: string, immediate = false): void {
  clearTimeout(previewDebounceTimer);
  previewDebounceTimer = undefined;

  if (immediate || isStreaming.value) {
    previewCode.value = value;
    previewPending.value = false;
    return;
  }

  previewPending.value = true;
  previewDebounceTimer = setTimeout(() => {
    previewCode.value = value;
    previewPending.value = false;
  }, 320);
}

/**
 * 加载当前 Tab 的示例内容并重置基线。
 */
async function loadActiveTab(): Promise<void> {
  loadController?.abort();
  stopStream();
  const controller = new AbortController();
  loadController = controller;
  tabLoading.value = true;
  loadError.value = null;
  const defaults = currentTab.value?.defaultFeatures;
  if (defaults) {
    features.value = { ...DEFAULT_MARKDOWN_FEATURES, ...defaults };
  }
  try {
    const next = await props.loadTabContent(activeTab.value, controller.signal);
    if (controller.signal.aborted) return;
    source.value = next;
    baselineSource.value = next;
    applyPreviewUpdate(next, true);
  } catch (error) {
    if (!controller.signal.aborted) {
      loadError.value = error instanceof Error ? error.message : String(error);
    }
  } finally {
    if (loadController === controller) tabLoading.value = false;
  }
}

/**
 * 以当前基线内容模拟流式写入。
 */
function playStream(): void {
  if (isStreaming.value) return;
  const content = source.value;
  if (!content.trim()) {
    ElMessage.warning('当前编辑器内容为空，请先载入或编辑 Markdown');
    return;
  }

  stopStream();
  isStreaming.value = true;
  source.value = '';
  applyPreviewUpdate('', true);

  streamController = createStreamInputController(content, {
    chunkMin: 2,
    chunkMax: 10,
    intervalMs: 45,
    onChunk: (partialText) => {
      source.value = partialText;
      scrollEditorToEnd();
    },
    onComplete: () => {
      isStreaming.value = false;
      streamController = undefined;
      ElMessage.success('流式输入已完成');
    }
  });
  streamController.start();
}

/**
 * 停止流式输入模拟。
 */
function stopStream(): void {
  streamController?.stop();
  streamController = undefined;
  isStreaming.value = false;
}

/**
 * 恢复当前案例的官方示例内容。
 */
async function reset(): Promise<void> {
  await loadActiveTab();
  ElMessage.success('已恢复为官方示例');
}

/**
 * 复制 Markdown 到剪贴板。
 */
async function copyMarkdown(): Promise<void> {
  try {
    await navigator.clipboard.writeText(source.value);
    copyDone.value = true;
    clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      copyDone.value = false;
    }, 2000);
    ElMessage.success('Markdown 已复制');
  } catch {
    ElMessage.error('复制失败，请手动选择复制');
  }
}

/**
 * 切换 Tab；若内容已修改则二次确认。
 * @param nextTab 目标 Tab
 */
async function handleTabChange(nextTab: string): Promise<void> {
  if (nextTab === activeTab.value) return;

  if (isStreaming.value) stopStream();

  if (isDirty.value) {
    try {
      await ElMessageBox.confirm(
        '当前示例已修改，切换后将载入新示例并丢失未保存内容。',
        '切换示例',
        { confirmButtonText: '继续切换', cancelButtonText: '取消', type: 'warning' }
      );
    } catch {
      return;
    }
  }

  activeTab.value = nextTab;
}

/**
 * CodeMirror 就绪后绑定格式化工具。
 * @param payload 编辑器实例
 */
function handleEditorReady(payload: { view: EditorView }): void {
  editorView.value = payload.view;
  editorHelper.setEditorView(payload.view);
}

/**
 * 全局快捷键：Ctrl/Cmd + B/I 等。
 */
function onGlobalKeydown(event: KeyboardEvent): void {
  editorHelper.handleKeydown(event, shortcuts);
}

watch(activeTab, () => {
  void loadActiveTab();
}, { immediate: true });

watch(source, (value) => applyPreviewUpdate(value));

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
  loadController?.abort();
  stopStream();
  clearTimeout(previewDebounceTimer);
  clearTimeout(copyResetTimer);
});

defineExpose({
  previewTarget,
  source: readonly(source),
  reset,
  stopStream
});
</script>
