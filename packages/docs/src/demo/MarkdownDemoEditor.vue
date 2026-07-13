<template>
  <div class="demo-workbench">
    <!-- 顶栏：当前示例信息 + 全局操作 -->
    <header class="demo-workbench__header">
      <div class="demo-workbench__meta">
        <h2 class="demo-workbench__title">{{ activeTabMeta?.label ?? 'Demo' }}</h2>
        <p class="demo-workbench__desc">{{ activeTabMeta?.description }}</p>
      </div>
      <div class="demo-workbench__status">
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
    </div>

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
            <Codemirror
              v-model="code"
              placeholder="在此编辑 Markdown…"
              :style="{ height: '100%' }"
              :indent-with-tab="true"
              :tab-size="2"
              :extensions="extensions"
              @ready="handleReady"
            />
          </div>
        </section>

        <section v-show="viewMode !== 'editor'" class="pane pane--preview">
          <div class="pane__head">
            <span class="pane__label">实时预览</span>
            <span class="pane__hint">
              {{ previewPending ? '渲染中…' : '与 @nnnb/markdown 推荐配置一致' }}
            </span>
          </div>
          <div class="pane__body preview-scroll">
            <div class="preview-content">
              <VueMarkdown :source="previewCode" />
            </div>
          </div>
        </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, shallowRef, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { ElMessageBox, ElMessage } from 'element-plus';
import VueMarkdown from '@/components/markdown';
import { EditorHelper } from './editorHelper';
import {
  DEMO_MARKDOWN,
  getDemoTabMeta,
  type DemoTabId
} from './demoData';
import { createShortcuts, createToolbarItems } from './editorActions';
import DemoSidebar from './DemoSidebar.vue';
import DemoMobileTabs from './DemoMobileTabs.vue';

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
const editorView = shallowRef<EditorView>();
const code = ref(DEMO_MARKDOWN.overview);
const baselineCode = ref(DEMO_MARKDOWN.overview);
const previewCode = ref(DEMO_MARKDOWN.overview);
const previewPending = ref(false);
const copyDone = ref(false);
const editorHelper = new EditorHelper();

let previewDebounceTimer: ReturnType<typeof setTimeout> | undefined;
let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

const isDirty = computed(() => code.value !== baselineCode.value);
const lineCount = computed(() => code.value.split('\n').length);
const charCount = computed(() => code.value.length);

const editorTheme = EditorView.theme({
  '&': { direction: 'ltr', height: '100%' },
  '.cm-scroller': { direction: 'ltr', fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px' },
  '.cm-content': { direction: 'ltr', unicodeBidi: 'plaintext', padding: '12px 0' },
  '.cm-gutters': { direction: 'ltr', background: '#f8fafc', borderRight: '1px solid #e2e8f0' },
  '.cm-activeLine': { background: '#f1f5f9' }
});

const extensions = [
  markdown(),
  EditorView.lineWrapping,
  editorTheme,
  keymap.of([indentWithTab, ...defaultKeymap])
];

/**
 * 防抖更新预览区 Markdown，避免 Mermaid 等重渲染卡顿
 * @param value 编辑器最新内容
 */
function schedulePreviewUpdate(value: string) {
  previewPending.value = true;
  clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(() => {
    previewCode.value = value;
    previewPending.value = false;
  }, 280);
}

/**
 * 载入指定 Tab 的示例内容
 * @param id Tab 标识
 */
function loadTabContent(id: DemoTabId) {
  const sample = DEMO_MARKDOWN[id];
  if (!sample) return;
  code.value = sample;
  baselineCode.value = sample;
  schedulePreviewUpdate(sample);
}

/**
 * 切换 Tab；若内容已修改则二次确认
 * @param nextTab 目标 Tab
 */
async function handleTabChange(nextTab: DemoTabId) {
  if (nextTab === props.activeTab) return;

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

watch(code, (value) => schedulePreviewUpdate(value));

function handleReady(payload: { view: EditorView }) {
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
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
  clearTimeout(previewDebounceTimer);
  clearTimeout(copyResetTimer);
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
