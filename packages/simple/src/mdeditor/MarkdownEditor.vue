<template>
  <div class="markdown-editor">
    <div class="toolbar">
      <div
        class="toolbar-item"
        title="用当前 Tab 的示例覆盖编辑器内容"
        @click="resetDemoForActiveTab"
      >
        <span class="toolbar-icon">重置示例</span>
      </div>
      <div
        class="toolbar-item"
        @click="togglePreview"
        :title="showPreview ? '隐藏预览' : '显示预览'"
      >
        <span class="toolbar-icon">
          {{ showPreview ? '隐藏预览' : '显示预览' }}
        </span>
      </div>
      <div
        class="toolbar-item"
        @click="toggleStreamTest"
        :title="isStreaming ? '停止流式输出测试' : '开始流式输出测试'"
      >
        <span class="toolbar-icon">
          {{ isStreaming ? '停止流式' : '流式测试' }}
        </span>
      </div>
      <div
        class="toolbar-item"
        :class="{ 'toolbar-item--disabled': !showPreview || exportBusy || previewBusy }"
        title="预览导出 PDF 分页效果（所见即所导）"
        @click="handlePreviewPdf"
      >
        <span class="toolbar-icon">{{ previewBusy ? '预览中…' : '预览 PDF' }}</span>
      </div>
      <div
        class="toolbar-item"
        :class="{ 'toolbar-item--disabled': !showPreview || exportBusy || previewBusy }"
        title="将右侧预览区截图导出为 PDF"
        @click="handleExportPdf"
      >
        <span class="toolbar-icon">{{ exportBusy ? '导出中…' : '导出 PDF' }}</span>
      </div>
      <div
        class="toolbar-item"
        :class="{ 'toolbar-item--disabled': !showPreview || exportBusy || previewBusy }"
        title="将右侧预览区截图导出为 PNG 长图"
        @click="handleExportPng"
      >
        <span class="toolbar-icon">{{ exportBusy ? '导出中…' : '导出 PNG' }}</span>
      </div>
    </div>
    <DemoTabsPanel v-model="activeDemoTab" :tabs="demoTabList" />

    <p class="demo-tabs-hint">
      左栏：切换 Tab 载入示例，并在下方编辑 Markdown；右栏：实时预览（与项目内
      VueMarkdown 配置一致）。可点「隐藏预览」单栏编辑。
    </p>
    <div
      class="editor-layout"
      :class="{ 'editor-layout--single': !showPreview }"
    >
      <!-- 左侧：分类 Tab、工具栏、源码编辑 -->
      <div class="editor-pane">
        <div class="toolbar">
          <div
            v-for="(item, index) in toolbarItems"
            :key="index"
            class="toolbar-item"
            :title="item.tooltip"
            @click="item.action()"
          >
            <span class="toolbar-icon">{{ item.icon }}</span>
          </div>
        </div>
        <div class="editor-container">
          <div class="editor-codemirror" dir="ltr">
            <Codemirror
              v-model="code"
              placeholder="请输入Markdown内容..."
              :style="{ height: editorHeight }"
              :autofocus="true"
              :indent-with-tab="true"
              :tab-size="2"
              :extensions="extensions"
              @ready="handleReady"
              @change="handleChange"
            />
          </div>
        </div>
      </div>
      <!-- 右侧：渲染预览 -->
      <div v-if="showPreview" class="preview-pane">
        <div class="preview-title">预览</div>
        <div class="preview-scroll">
          <MarkdownExportHost ref="exportHostRef" class="preview-content">
            <VueMarkdown :source="code"></VueMarkdown>
          </MarkdownExportHost>
        </div>
      </div>
    </div>

    <ExportPreviewModal
      :open="previewOpen"
      :title="`PDF 预览 · ${activeDemoTab}`"
      :pages="previewPages"
      :loading="previewBusy"
      :error="previewError"
      :filename="`markdown-${activeDemoTab}`"
      :pdf-blob="previewPdfBlob"
      :pdf="pdfExportOptions"
      :layout="previewLayout"
      configurable
      @close="handlePreviewClose"
      @update:pdf="handlePdfConfigChange"
    />
  </div>
</template>

<script lang="ts" setup>
  import { ref, shallowRef, onMounted, onBeforeUnmount, watch } from 'vue';
  import { Codemirror } from 'vue-codemirror';
  import { markdown } from '@codemirror/lang-markdown';
  import { EditorView, keymap } from '@codemirror/view';
  import { defaultKeymap, indentWithTab } from '@codemirror/commands';
  import VueMarkdown from '../components/markdown';
  import {
    MarkdownExportHost,
    ExportPreviewModal,
    type MarkdownExportHostExpose
  } from '@nnnb/markdown/vue-ui';
  import type { ExportPreviewPage, PdfExportOptions } from '@nnnb/markdown';
  import type { PdfPageBreakContext } from '@nnnb/markdown';
  import {
    buildPdfPreviewFromCanvas,
    captureTargetCanvas,
    mergePdfOptions
  } from '@nnnb/markdown';
  import { EditorHelper } from './editorHelper';
  import { DEMO_MARKDOWN, demoTabList, type DemoTabId } from './demoData';
  import { useStreamPlayback } from '../hooks/useStreamPlayback';
  import { createShortcuts, createToolbarItems } from './editorActions';
  import DemoTabsPanel from './DemoTabsPanel.vue';

  const activeDemoTab = ref<DemoTabId>('diagrams');
  /** 编辑器高度：左栏为纵向 flex 时填充满剩余区域 */
  const editorHeight = ref('100%');

  /** 编辑器视图引用 */
  const editorView = shallowRef();
  /** 编辑器内容 */
  const code = ref(DEMO_MARKDOWN.diagrams);

  /** 是否显示预览 */
  const showPreview = ref(true);
  /** 导出进行中 */
  const exportBusy = ref(false);
  /** PDF 预览弹层 */
  const previewOpen = ref(false);
  const previewBusy = ref(false);
  const previewError = ref<string | null>(null);
  const previewPages = ref<ExportPreviewPage[]>([]);
  const previewPdfBlob = ref<Blob | null>(null);
  const previewLayout = ref<{ pageWidthMm: number; pageHeightMm: number } | null>(
    null
  );
  const previewSourceCanvas = ref<HTMLCanvasElement | null>(null);
  const previewPageBreakContext = ref<PdfPageBreakContext | null>(null);
  /** PDF 分页配置 */
  const pdfExportOptions = ref<PdfExportOptions>({
    mode: 'paginated',
    pageSize: 'a4',
    orientation: 'portrait',
    marginMm: 10
  });
  /** 导出宿主 ref */
  const exportHostRef = ref<MarkdownExportHostExpose | null>(null);
  /** 编辑器助手实例 */
  const editorHelper = new EditorHelper();
  const {
    isStreaming,
    startStreamTest,
    stopStreamTest,
    toggleStreamTest: _toggleStreamTest
  } = useStreamPlayback({
    chunkSize: 6,
    intervalMs: 400,
    onChunk: (chunk: string) => {
      code.value += chunk;
    }
  });

  const toggleStreamTest = () => {
    if (isStreaming.value) {
      stopStreamTest();
    } else {
      const currentCode = code.value;
      code.value = '';

      startStreamTest(currentCode);
    }
  };

  /**
   * 强制编辑区从左到右排版（避免父级 dir 或强 RTL 字符影响光标与换行）
   */
  const ltrEditorTheme = EditorView.theme({
    '&': { direction: 'ltr' },
    '.cm-scroller': { direction: 'ltr' },
    '.cm-content': { direction: 'ltr', unicodeBidi: 'plaintext' },
    '.cm-gutters': { direction: 'ltr' }
  });

  /** 编辑器扩展 */
  const extensions = [
    markdown(),
    EditorView.lineWrapping,
    ltrEditorTheme,
    keymap.of([indentWithTab, ...defaultKeymap])
  ];

  /** 将当前 Tab 的示例重新写入编辑器 */
  function resetDemoForActiveTab() {
    code.value = DEMO_MARKDOWN[activeDemoTab.value];
  }

  /** 与 activeDemoTab 保持内容一致（含 v-model 程序化变更） */
  watch(activeDemoTab, (id) => {
    if (DEMO_MARKDOWN[id]) {
      code.value = DEMO_MARKDOWN[id];
    }
  });

  /** 编辑器就绪回调 */
  function handleReady(payload: any) {
    editorView.value = payload.view;
    editorHelper.setEditorView(payload.view);
  }

  /** 编辑器内容变化回调 */
  function handleChange(value: string) {
    code.value = value;
  }

  /** 切换预览 */
  function togglePreview() {
    showPreview.value = !showPreview.value;
  }

  /**
   * 应用预览结果
   * @param canvas 已截图 Canvas
   */
  async function applyPreviewResult(canvas: HTMLCanvasElement) {
    const result = await buildPdfPreviewFromCanvas(
      canvas,
      pdfExportOptions.value,
      previewPageBreakContext.value ?? undefined
    );
    previewPages.value = result.pages;
    previewPdfBlob.value = result.pdfBlob;
    previewLayout.value = {
      pageWidthMm: result.layout.pageWidthMm,
      pageHeightMm: result.layout.pageHeightMm
    };
  }

  /**
   * 关闭 PDF 预览
   */
  function handlePreviewClose() {
    previewOpen.value = false;
    previewSourceCanvas.value = null;
    previewPageBreakContext.value = null;
  }

  /**
   * 分页配置变更后重新切片
   * @param patch 增量配置
   */
  async function handlePdfConfigChange(patch: PdfExportOptions) {
    pdfExportOptions.value = mergePdfOptions(pdfExportOptions.value, patch);
    if (!previewSourceCanvas.value) return;

    previewBusy.value = true;
    previewError.value = null;

    try {
      await applyPreviewResult(previewSourceCanvas.value);
    } catch (error) {
      console.error('[MarkdownEditor] 更新 PDF 分页配置失败', error);
      previewError.value = '更新分页配置失败';
    } finally {
      previewBusy.value = false;
    }
  }

  /**
   * 预览 PDF 分页效果
   */
  async function handlePreviewPdf() {
    if (!showPreview.value || exportBusy.value || previewBusy.value || !exportHostRef.value) {
      return;
    }

    previewOpen.value = true;
    previewBusy.value = true;
    previewError.value = null;
    previewPages.value = [];
    previewPdfBlob.value = null;
    previewLayout.value = null;
    previewSourceCanvas.value = null;
    previewPageBreakContext.value = null;

    try {
      const target = exportHostRef.value.getTarget();
      if (!target) throw new Error('导出容器未就绪');

      const captureResult = await captureTargetCanvas(target, {
        capture: {
          width: Math.ceil(target.getBoundingClientRect().width),
          syncStyles: true
        }
      });
      previewSourceCanvas.value = captureResult.canvas;
      previewPageBreakContext.value = captureResult.pageBreakContext;
      await applyPreviewResult(captureResult.canvas);
    } catch (error) {
      console.error('[MarkdownEditor] 预览 PDF 失败', error);
      previewError.value = '预览 PDF 失败，请确认预览区已渲染完成';
    } finally {
      previewBusy.value = false;
    }
  }

  /**
   * 导出 PDF
   */
  async function handleExportPdf() {
    if (!showPreview.value || exportBusy.value || !exportHostRef.value) return;
    exportBusy.value = true;
    try {
      const target = exportHostRef.value.getTarget();
      if (!target) throw new Error('导出容器未就绪');
      await exportHostRef.value.exportPdf(`markdown-${activeDemoTab.value}`, {
        capture: {
          width: Math.ceil(target.getBoundingClientRect().width),
          syncStyles: true
        },
        pdf: pdfExportOptions.value
      });
    } catch (error) {
      console.error('[MarkdownEditor] 导出 PDF 失败', error);
      window.alert('导出 PDF 失败，请确认预览区已渲染完成');
    } finally {
      exportBusy.value = false;
    }
  }

  /**
   * 导出 PNG
   */
  async function handleExportPng() {
    if (!showPreview.value || exportBusy.value || !exportHostRef.value) return;
    exportBusy.value = true;
    try {
      const target = exportHostRef.value.getTarget();
      if (!target) throw new Error('导出容器未就绪');
      await exportHostRef.value.exportPng(`markdown-${activeDemoTab.value}`, {
        capture: {
          width: Math.ceil(target.getBoundingClientRect().width),
          syncStyles: true
        }
      });
    } catch (error) {
      console.error('[MarkdownEditor] 导出 PNG 失败', error);
      window.alert('导出 PNG 失败，请确认预览区已渲染完成');
    } finally {
      exportBusy.value = false;
    }
  }

  /** 工具栏配置 */
  const toolbarItems = createToolbarItems(editorHelper);
  /** 快捷键配置 */
  const shortcuts = createShortcuts(editorHelper);

  /**
   * 全局快捷键分发（需具名函数以便移除监听）
   * @param e 键盘事件
   */
  function onGlobalKeydown(e: KeyboardEvent) {
    editorHelper.handleKeydown(e, shortcuts);
  }

  onMounted(() => {
    window.addEventListener('keydown', onGlobalKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onGlobalKeydown);
    stopStreamTest();
  });
</script>

<style scoped>
  .markdown-editor {
    display: flex;
    flex-direction: column;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
    height: min(88vh, 920px);
    min-height: 480px;
    background: #fff;
  }

  /** 左右主布局：左编辑、右预览 */
  .editor-layout {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .editor-layout--single .editor-pane {
    border-right: none;
  }

  /** 左侧栏：纵向堆叠 Tab → 工具栏 → CodeMirror */
  .editor-pane {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #e0e0e0;
  }

  /** 右侧栏：预览区独立滚动 */
  .preview-pane {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    padding: 12px 16px 16px;
    background-color: #fafafa;
    overflow: hidden;
  }

  .toolbar {
    flex-shrink: 0;
    display: flex;
    flex-wrap: wrap;
    padding: 8px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #ddd;
  }

  .toolbar-item {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    min-width: 32px;
    margin-right: 8px;
    margin-bottom: 4px;
    padding: 0 8px;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .toolbar-item:hover {
    background-color: #e0e0e0;
  }

  .toolbar-item--disabled {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
  }

  .toolbar-icon {
    font-size: 14px;
  }

  .editor-container {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /** 让 vue-codemirror 根节点参与 flex 撑满左栏剩余高度 */
  .editor-codemirror {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .preview-title {
    flex-shrink: 0;
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 8px;
    color: #333;
  }

  .preview-scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .preview-content {
    min-height: 120px;
    padding: 8px;
    border: 1px solid #eee;
    border-radius: 4px;
    background: #fff;
    box-sizing: border-box;
  }

  .preview-content.is-export-capturing {
    overflow: visible !important;
  }

  :deep(.cm-editor) {
    height: 100%;
    flex: 1;
    min-height: 0;
    direction: ltr;
    text-align: left;
  }

  :deep(.cm-scroller) {
    overflow: auto;
    direction: ltr;
    font-family: Consolas, Monaco, 'Andale Mono', monospace;
    font-size: 14px;
    line-height: 1.5;
  }

  :deep(.cm-content) {
    direction: ltr;
    unicode-bidi: plaintext;
  }

  :deep(.cm-line) {
    direction: ltr;
    text-align: left;
  }
</style>
