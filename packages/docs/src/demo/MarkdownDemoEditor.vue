<template>
  <div class="demo-workbench">
    <!-- 顶栏：当前示例信息 + 全局操作 -->
    <header class="demo-workbench__header">
      <div class="demo-workbench__meta">
        <h2 class="demo-workbench__title">{{ activeTabMeta?.label ?? 'Demo' }}</h2>
        <p class="demo-workbench__desc">{{ activeTabMeta?.description }}</p>
      </div>
      <div class="demo-workbench__status">
        <span v-if="isStreaming" class="status-badge status-badge--streaming">流式输出中</span>
        <span v-if="isDirty" class="status-badge status-badge--dirty">已修改</span>
        <span class="status-badge">{{ lineCount }} 行 · {{ charCount }} 字</span>
      </div>
    </header>

    <!-- 工具栏 -->
    <div class="demo-workbench__toolbar">
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
        <button type="button" class="tool-btn" title="重置为当前示例" @click="resetDemoForActiveTab">
          重置
        </button>
        <button type="button" class="tool-btn" title="复制 Markdown 源码" @click="copyMarkdown">
          {{ copyDone ? '已复制' : '复制 MD' }}
        </button>
        <div class="format-btns">
          <button
            v-for="(item, index) in toolbarItems"
            :key="index"
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
          @click="startStreamInput"
        >
          流式输入
        </button>
        <button
          type="button"
          class="tool-btn"
          :disabled="!isStreaming"
          title="停止流式输出"
          @click="stopStreamInput"
        >
          停止
        </button>
      </div>
    </div>

    <DemoFeaturePanel
      v-model="featureConfig"
      :is-default="isFeatureDefault"
      @reset="resetFeatureConfig"
    />

    <!-- 主体：侧栏 + 编辑/预览 -->
    <div class="demo-workbench__body">
      <DemoSidebar
        :model-value="activeTabModel"
        :collapsed="sidebarCollapsed"
        @update:model-value="handleTabChange"
        @update:collapsed="sidebarCollapsed = $event"
      />

      <div class="demo-workbench__main">
        <DemoMobileTabs
          :model-value="activeTabModel"
          @update:model-value="handleTabChange"
        />

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
            <DemoCodeMirror
              v-if="editorReady"
              v-model="code"
              @ready="handleReady"
            />
            <DemoLoading v-else message="正在加载编辑器…" />
          </div>
        </section>

        <section v-show="viewMode !== 'editor'" class="pane pane--preview">
          <div class="pane__head">
            <span class="pane__label">实时预览</span>
            <span class="pane__hint">
              {{
                isStreaming
                  ? '流式实时预览'
                  : previewPending
                    ? '渲染中…'
                    : isFeatureDefault
                      ? '与当前示例推荐配置一致'
                      : '自定义特性配置预览'
              }}
            </span>
          </div>
          <div class="pane__body preview-scroll">
            <div v-if="tabLoading" class="preview-content preview-content--loading">
              <DemoLoading message="正在载入示例…" />
            </div>
            <div v-else-if="previewReady" class="preview-content">
              <VueMarkdown
                :key="previewFeatureKey"
                :source="previewCode"
                :features="featureConfig"
              />
            </div>
            <div v-else class="preview-content preview-content--loading">
              <DemoLoading message="正在准备预览…" />
            </div>
          </div>
        </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, shallowRef, computed, onMounted, onBeforeUnmount, watch, defineAsyncComponent } from 'vue';
import { EditorView } from '@codemirror/view';
import { ElMessageBox, ElMessage } from 'element-plus';
import { EditorHelper } from './editorHelper';
import { getDemoTabMeta, type DemoTabId } from './demoData';
import { loadDemoMarkdown } from './demoMarkdownLoader';
import { createShortcuts, createToolbarItems } from './editorActions';
import {
  createStreamInputController,
  type StreamInputController
} from './streamInputSimulator';
import DemoSidebar from './DemoSidebar.vue';
import DemoMobileTabs from './DemoMobileTabs.vue';
import DemoLoading from './DemoLoading.vue';
import DemoFeaturePanel from './DemoFeaturePanel.vue';
import {
  getDefaultFeaturesForTab,
  isDefaultFeaturesForTab,
  type DemoMarkdownFeatures
} from './demoFeatureConfig';

/** 预览 Markdown 封装（含 Mermaid 等重依赖）异步加载 */
const VueMarkdown = defineAsyncComponent({
  loader: () => import('@/components/markdown'),
  loadingComponent: DemoLoading,
  delay: 80
});

/** CodeMirror 编辑器异步加载 */
const DemoCodeMirror = defineAsyncComponent({
  loader: () => import('./DemoCodeMirror.vue'),
  loadingComponent: DemoLoading,
  delay: 80
});

/** 预览区布局模式 */
type ViewMode = 'split' | 'editor' | 'preview';

const props = defineProps<{
  activeTab: DemoTabId;
}>();

const emit = defineEmits<{
  'update:activeTab': [value: DemoTabId];
}>();

const viewModes: { id: ViewMode; label: string; title: string }[] = [
  { id: 'split', label: '分栏', title: '编辑与预览并排' },
  { id: 'editor', label: '编辑', title: '仅显示编辑器' },
  { id: 'preview', label: '预览', title: '仅显示预览' }
];

const activeTabModel = computed({
  get: () => props.activeTab,
  set: (value: DemoTabId) => emit('update:activeTab', value)
});

const activeTabMeta = computed(() => getDemoTabMeta(props.activeTab));
const viewMode = ref<ViewMode>('split');
const sidebarCollapsed = ref(false);
const editorView = shallowRef<import('@codemirror/view').EditorView>();
const code = ref('');
const baselineCode = ref('');
const previewCode = ref('');
const previewPending = ref(false);
const tabLoading = ref(false);
const editorReady = ref(false);
/** 示例 Markdown 已载入，可与编辑器错峰挂载预览 */
const contentLoaded = ref(false);
const previewReady = ref(false);
const copyDone = ref(false);
const isStreaming = ref(false);
const featureConfig = ref<DemoMarkdownFeatures>(getDefaultFeaturesForTab(props.activeTab));
const editorHelper = new EditorHelper();

let streamController: StreamInputController | undefined;

let previewDebounceTimer: ReturnType<typeof setTimeout> | undefined;
let copyResetTimer: ReturnType<typeof setTimeout> | undefined;
let previewMountIdleId: number | undefined;

const isDirty = computed(() => code.value !== baselineCode.value);
const lineCount = computed(() => code.value.split('\n').length);
const charCount = computed(() => code.value.length);
const isFeatureDefault = computed(() =>
  isDefaultFeaturesForTab(props.activeTab, featureConfig.value)
);
/** 特性变更时强制重建预览组件，确保插件/组件映射生效 */
const previewFeatureKey = computed(() => JSON.stringify(featureConfig.value));

/**
 * 恢复当前 Tab 的推荐特性配置。
 */
function resetFeatureConfig() {
  featureConfig.value = getDefaultFeaturesForTab(props.activeTab);
}

/**
 * 将编辑器滚动到文档末尾，便于观察流式追加内容。
 */
function scrollEditorToEnd() {
  const view = editorView.value;
  if (!view) {
    return;
  }

  view.dispatch({
    effects: EditorView.scrollIntoView(view.state.doc.length, { y: 'nearest' })
  });
}

/**
 * 停止流式输入模拟。
 */
function stopStreamInput() {
  streamController?.stop();
  streamController = undefined;
  isStreaming.value = false;
}

/**
 * 开始流式输入模拟：清空编辑器后，将当前内容逐块回放写入。
 */
function startStreamInput() {
  if (isStreaming.value) {
    return;
  }

  const sourceText = code.value;
  if (!sourceText.trim()) {
    ElMessage.warning('当前编辑器内容为空，请先载入或编辑 Markdown');
    return;
  }

  stopStreamInput();
  isStreaming.value = true;
  code.value = '';
  applyPreviewUpdate('', true);
  contentLoaded.value = true;
  schedulePreviewMount();

  streamController = createStreamInputController(sourceText, {
    chunkMin: 2,
    chunkMax: 10,
    intervalMs: 45,
    onChunk: (partialText) => {
      code.value = partialText;
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
 * 更新预览区 Markdown；流式模式下立即同步，普通编辑走防抖。
 * @param value 编辑器最新内容
 * @param immediate 是否跳过防抖立即更新
 */
function applyPreviewUpdate(value: string, immediate = false) {
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
 * 取消待执行的预览挂载，避免 Tab 快速切换时重复排队
 */
function cancelPreviewMount() {
  if (previewMountIdleId === undefined) return;

  if (typeof cancelIdleCallback === 'function') {
    cancelIdleCallback(previewMountIdleId);
  } else {
    clearTimeout(previewMountIdleId);
  }

  previewMountIdleId = undefined;
}

/**
 * 在编辑器就绪后 idle 挂载 VueMarkdown，避免与 CodeMirror 同时抢主线程
 */
function schedulePreviewMount() {
  cancelPreviewMount();
  previewReady.value = false;

  if (!contentLoaded.value || !editorReady.value) {
    return;
  }

  const mount = () => {
    previewMountIdleId = undefined;
    if (contentLoaded.value && editorReady.value) {
      previewReady.value = true;
    }
  };

  if (typeof requestIdleCallback === 'function') {
    previewMountIdleId = requestIdleCallback(mount, { timeout: 700 });
  } else {
    previewMountIdleId = window.setTimeout(mount, 120);
  }
}

/**
 * 载入指定 Tab 的示例内容
 * @param id Tab 标识
 */
async function loadTabContent(id: DemoTabId) {
  stopStreamInput();
  featureConfig.value = getDefaultFeaturesForTab(id);
  tabLoading.value = true;
  contentLoaded.value = false;
  previewReady.value = false;
  cancelPreviewMount();

  try {
    const sample = await loadDemoMarkdown(id);
    code.value = sample;
    baselineCode.value = sample;
    applyPreviewUpdate(sample);
    contentLoaded.value = true;
    schedulePreviewMount();
  } finally {
    tabLoading.value = false;
  }
}

/**
 * 切换 Tab；若内容已修改则二次确认
 * @param nextTab 目标 Tab
 */
async function handleTabChange(nextTab: DemoTabId) {
  if (nextTab === props.activeTab) return;

  if (isStreaming.value) {
    stopStreamInput();
  }

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

  activeTabModel.value = nextTab;
}

/** 重置为当前 Tab 官方示例 */
function resetDemoForActiveTab() {
  loadTabContent(activeTabModel.value);
  ElMessage.success('已恢复为官方示例');
}

/** 复制 Markdown 到剪贴板 */
async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(code.value);
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

watch(
  () => props.activeTab,
  (id) => loadTabContent(id),
  { immediate: true }
);

watch(code, (value) => applyPreviewUpdate(value));

function handleReady(payload: { view: import('@codemirror/view').EditorView }) {
  editorView.value = payload.view;
  editorHelper.setEditorView(payload.view);
}

const toolbarItems = createToolbarItems(editorHelper);
const shortcuts = createShortcuts(editorHelper);

function onGlobalKeydown(e: KeyboardEvent) {
  editorHelper.handleKeydown(e, shortcuts);
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown);

  /** 先渲染壳层，再 idle 挂载 CodeMirror；预览在编辑器就绪后二次 idle 挂载 */
  const mountEditor = () => {
    editorReady.value = true;
    schedulePreviewMount();
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(mountEditor, { timeout: 400 });
  } else {
    window.setTimeout(mountEditor, 16);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
  clearTimeout(previewDebounceTimer);
  clearTimeout(copyResetTimer);
  cancelPreviewMount();
  stopStreamInput();
});
</script>

<style scoped>
.demo-workbench {
  display: flex;
  flex-direction: column;
  height: min(calc(100vh - 140px), 860px);
  min-height: 520px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.06);
}

.demo-workbench__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
}

.demo-workbench__title {
  margin: 0 0 4px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.demo-workbench__desc {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.demo-workbench__status {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.status-badge {
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 999px;
}

.status-badge--dirty {
  color: #b45309;
  background: #fffbeb;
}

.status-badge--streaming {
  color: #1d4ed8;
  background: #dbeafe;
}

.demo-workbench__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.toolbar-group__label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.04em;
  margin-right: 2px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e2e8f0;
}

.view-switch {
  display: inline-flex;
  padding: 2px;
  background: #f1f5f9;
  border-radius: 8px;
}

.view-switch__btn {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.view-switch__btn.is-active {
  color: #2563eb;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.tool-btn {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.tool-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.tool-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tool-btn--stream.is-active {
  color: #2563eb;
  border-color: #93c5fd;
  background: #eff6ff;
}

.format-btns {
  display: inline-flex;
  gap: 2px;
  margin-left: 4px;
  padding: 2px;
  background: #f8fafc;
  border-radius: 6px;
}

.format-btn {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.format-btn:hover {
  background: #e2e8f0;
}

.demo-workbench__body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.demo-workbench__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.demo-workbench__workspace {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.demo-workbench__workspace--editor {
  grid-template-columns: 1fr;
}

.demo-workbench__workspace--preview {
  grid-template-columns: 1fr;
}

.pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.pane--editor {
  border-right: 1px solid #e2e8f0;
}

.demo-workbench__workspace--preview .pane--editor {
  display: none;
}

.demo-workbench__workspace--editor .pane--preview {
  display: none;
}

.pane__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafafa;
}

.pane__label {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.pane__hint {
  font-size: 11px;
  color: #94a3b8;
}

.pane__body {
  flex: 1;
  min-height: 0;
}

.editor-codemirror {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-scroll {
  height: 100%;
  overflow: auto;
  padding: 12px 14px 16px;
  background: #f8fafc;
}

.preview-content {
  min-height: 120px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-sizing: border-box;
}

.preview-content--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 0;
}

.preview-content--loading :deep(.demo-loading) {
  min-height: 200px;
  padding: 12px;
}

.preview-content--loading :deep(.demo-loading__panel) {
  box-shadow: none;
  border: none;
}

:deep(.cm-editor) {
  height: 100%;
  flex: 1;
}

@media (max-width: 960px) {
  .demo-workbench {
    height: auto;
    min-height: 640px;
  }

  .demo-workbench__workspace--split {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(240px, 1fr) minmax(280px, 1fr);
  }

  .pane--editor {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .demo-sidebar {
    display: none;
  }

  .toolbar-divider {
    display: none;
  }
}
</style>
