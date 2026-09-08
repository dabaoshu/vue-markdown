<template>
  <MarkdownWorkbench
    ref="workbenchRef"
    v-model:source="source"
    v-model:active-tab="activeTab"
    v-model:features="features"
    :tabs="simpleWorkbenchTabs"
    :load-tab-content="loadSimpleWorkbenchTab"
  >
    <template #toolbar-end>
      <button class="tool-btn" :disabled="!exportTarget || exportBusy" @click="handlePreviewPdf">预览 PDF</button>
      <button class="tool-btn" :disabled="!exportTarget || exportBusy" @click="handleExportPdf">导出 PDF</button>
      <button class="tool-btn" :disabled="!exportTarget || exportBusy" @click="handleExportPng">导出 PNG</button>
    </template>
  </MarkdownWorkbench>

  <ExportPreviewModal
    :open="previewOpen"
    :title="`PDF 预览 · ${activeTab}`"
    :pages="previewPages"
    :loading="previewBusy"
    :error="previewError"
    :filename="`markdown-${activeTab}`"
    :pdf-blob="previewPdfBlob"
    :pdf="pdfExportOptions"
    :layout="previewLayout"
    configurable
    @close="handlePreviewClose"
    @update:pdf="handlePdfConfigChange"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { ExportPreviewModal } from '@nnnb/markdown/vue-ui';
import {
  buildPdfPreviewFromCanvas,
  captureTargetCanvas,
  exportDomAsPdf,
  exportDomAsPng,
  mergePdfOptions,
  type ExportPreviewPage,
  type PdfExportOptions,
  type PdfPageBreakContext
} from '@nnnb/markdown';
import { MarkdownWorkbench, type MarkdownWorkbenchExpose } from '@nnnb/markdown-ui';
import {
  initialSimpleFeatures,
  loadSimpleWorkbenchTab,
  simpleWorkbenchTabs
} from './simpleWorkbenchData';

const workbenchRef = ref<MarkdownWorkbenchExpose | null>(null);
const source = ref('');
const activeTab = ref('diagrams');
const features = ref({ ...initialSimpleFeatures });
const exportTarget = computed(
  () => workbenchRef.value?.previewTarget ?? null
);

const exportBusy = ref(false);
const previewOpen = ref(false);
const previewBusy = ref(false);
const previewError = ref<string | null>(null);
const previewPages = ref<ExportPreviewPage[]>([]);
const previewPdfBlob = ref<Blob | null>(null);
const previewLayout = ref<{ pageWidthMm: number; pageHeightMm: number } | null>(null);
const previewSourceCanvas = ref<HTMLCanvasElement | null>(null);
const previewPageBreakContext = ref<PdfPageBreakContext | null>(null);
const pdfExportOptions = ref<PdfExportOptions>({
  mode: 'paginated',
  pageSize: 'a4',
  orientation: 'portrait',
  marginMm: 10
});

function requireExportTarget(): HTMLElement {
  const target = exportTarget.value;
  if (!target) throw new Error('Markdown 预览尚未准备完成');
  return target;
}

async function applyPreviewResult(canvas: HTMLCanvasElement): Promise<void> {
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

function handlePreviewClose(): void {
  previewOpen.value = false;
  previewSourceCanvas.value = null;
  previewPageBreakContext.value = null;
}

async function handlePdfConfigChange(patch: PdfExportOptions): Promise<void> {
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

async function handlePreviewPdf(): Promise<void> {
  if (exportBusy.value || previewBusy.value) return;
  previewOpen.value = true;
  previewBusy.value = true;
  previewError.value = null;
  previewPages.value = [];
  previewPdfBlob.value = null;
  previewLayout.value = null;
  previewSourceCanvas.value = null;
  previewPageBreakContext.value = null;
  try {
    const target = requireExportTarget();
    const result = await captureTargetCanvas(target, {
      capture: {
        width: Math.ceil(target.getBoundingClientRect().width),
        syncStyles: true
      }
    });
    previewSourceCanvas.value = result.canvas;
    previewPageBreakContext.value = result.pageBreakContext;
    await applyPreviewResult(result.canvas);
  } catch (error) {
    console.error('[MarkdownEditor] 预览 PDF 失败', error);
    previewError.value = '预览 PDF 失败，请确认预览区已渲染完成';
  } finally {
    previewBusy.value = false;
  }
}

async function handleExportPdf(): Promise<void> {
  if (exportBusy.value) return;
  exportBusy.value = true;
  try {
    const target = requireExportTarget();
    await exportDomAsPdf(target, `markdown-${activeTab.value}`, {
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

async function handleExportPng(): Promise<void> {
  if (exportBusy.value) return;
  exportBusy.value = true;
  try {
    const target = requireExportTarget();
    await exportDomAsPng(target, `markdown-${activeTab.value}`, {
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

onBeforeUnmount(() => {
  workbenchRef.value?.stopStream();
  handlePreviewClose();
});
</script>
