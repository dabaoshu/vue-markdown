import { defineComponent, ref, watch, PropType } from 'vue';
import type { MarkdownExportHostExpose } from './MarkdownExportHost';
import { ExportPreviewModal } from './ExportPreviewModal';
import type { ExportPreviewPage, PdfExportOptions } from '../core/types';
import type { PdfPageBreakContext } from '../core/pdfPagination';
import { mergePdfOptions } from '../core/pdfPagination';
import {
  buildPdfPreviewFromCanvas,
  captureTargetCanvas
} from '../engine/exportFromDom';

/**
 * 导出工具栏：绑定 MarkdownExportHost 实例，提供 PDF 预览 / 导出按钮
 */
export const ExportToolbar = defineComponent({
  name: 'ExportToolbar',
  props: {
    host: {
      type: Object as PropType<MarkdownExportHostExpose | null>,
      required: false,
      default: null
    },
    filename: {
      type: String,
      required: false,
      default: 'markdown-export'
    },
    disabled: {
      type: Boolean,
      required: false,
      default: false
    },
    previewTitle: {
      type: String,
      required: false,
      default: 'PDF 预览'
    },
    /** PDF 分页配置 */
    pdf: {
      type: Object as PropType<PdfExportOptions>,
      required: false,
      default: () => ({})
    },
    /** 预览弹层内是否展示分页配置面板 */
    pdfConfigurable: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  emits: [
    'export-start',
    'export-success',
    'export-error',
    'preview-open',
    'preview-success',
    'preview-error',
    'update:pdf'
  ],
  setup(props, { emit }) {
    const exporting = ref(false);
    const previewOpen = ref(false);
    const previewLoading = ref(false);
    const previewError = ref<string | null>(null);
    const previewPages = ref<ExportPreviewPage[]>([]);
    const previewPdfBlob = ref<Blob | null>(null);
    const previewLayout = ref<{ pageWidthMm: number; pageHeightMm: number } | null>(
      null
    );
    const previewSourceCanvas = ref<HTMLCanvasElement | null>(null);
    const previewPageBreakContext = ref<PdfPageBreakContext | null>(null);
    const pdfOptions = ref<PdfExportOptions>({ ...props.pdf });

    watch(
      () => props.pdf,
      (value) => {
        pdfOptions.value = { ...value };
      },
      { deep: true }
    );

    /**
     * 构建与导出一致的截图参数
     */
    const buildCaptureOptions = () => {
      const target = props.host?.getTarget();
      if (!target) return undefined;

      return {
        width: Math.ceil(target.getBoundingClientRect().width),
        syncStyles: true
      } as const;
    };

    /**
     * 应用预览结果到弹层状态
     */
    const applyPreviewResult = async (canvas: HTMLCanvasElement) => {
      const result = await buildPdfPreviewFromCanvas(
        canvas,
        pdfOptions.value,
        previewPageBreakContext.value ?? undefined
      );
      previewPages.value = result.pages;
      previewPdfBlob.value = result.pdfBlob;
      previewLayout.value = {
        pageWidthMm: result.layout.pageWidthMm,
        pageHeightMm: result.layout.pageHeightMm
      };
      return result;
    };

    /**
     * 执行导出
     * @param type 导出类型
     */
    const runExport = async (type: 'pdf' | 'png') => {
      if (!props.host || props.disabled || exporting.value) return;

      exporting.value = true;
      emit('export-start', type);

      try {
        const capture = buildCaptureOptions();
        const result =
          type === 'pdf'
            ? await props.host.exportPdf(props.filename, {
                capture,
                pdf: pdfOptions.value
              })
            : await props.host.exportPng(props.filename, { capture });
        emit('export-success', result);
      } catch (error) {
        emit('export-error', error);
        console.error('[ExportToolbar] 导出失败', error);
      } finally {
        exporting.value = false;
      }
    };

    /**
     * 分页配置变更后重新切片（复用已截图 Canvas）
     * @param patch 增量配置
     */
    const handlePdfConfigChange = async (patch: PdfExportOptions) => {
      pdfOptions.value = mergePdfOptions(pdfOptions.value, patch);
      emit('update:pdf', pdfOptions.value);

      if (!previewSourceCanvas.value) return;

      previewLoading.value = true;
      previewError.value = null;

      try {
        const result = await applyPreviewResult(previewSourceCanvas.value);
        emit('preview-success', result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '分页配置更新失败';
        previewError.value = message;
        emit('preview-error', error);
      } finally {
        previewLoading.value = false;
      }
    };

    /**
     * 打开 PDF 预览弹层
     */
    const openPreview = async () => {
      if (!props.host || props.disabled || exporting.value || previewLoading.value) {
        return;
      }

      previewOpen.value = true;
      previewLoading.value = true;
      previewError.value = null;
      previewPages.value = [];
      previewPdfBlob.value = null;
      previewLayout.value = null;
      previewSourceCanvas.value = null;
      previewPageBreakContext.value = null;
      emit('preview-open');

      try {
        const target = props.host.getTarget();
        if (!target) throw new Error('导出容器未就绪');

        const captureResult = await captureTargetCanvas(target, {
          capture: buildCaptureOptions()
        });
        previewSourceCanvas.value = captureResult.canvas;
        previewPageBreakContext.value = captureResult.pageBreakContext;

        const result = await applyPreviewResult(captureResult.canvas);
        emit('preview-success', result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '预览生成失败，请稍后重试';
        previewError.value = message;
        emit('preview-error', error);
        console.error('[ExportToolbar] 预览失败', error);
      } finally {
        previewLoading.value = false;
      }
    };

    /**
     * 关闭预览弹层
     */
    const closePreview = () => {
      previewOpen.value = false;
      previewSourceCanvas.value = null;
      previewPageBreakContext.value = null;
    };

    const busy = () => exporting.value || previewLoading.value;

    return () => (
      <>
        <div class='markdown-export-toolbar' data-export-ignore>
          <button
            type='button'
            class='markdown-export-toolbar__btn'
            disabled={props.disabled || busy() || !props.host}
            onClick={() => void openPreview()}
          >
            {previewLoading.value ? '预览中…' : '预览 PDF'}
          </button>
          <button
            type='button'
            class='markdown-export-toolbar__btn'
            disabled={props.disabled || busy() || !props.host}
            onClick={() => void runExport('pdf')}
          >
            {exporting.value ? '导出中…' : '导出 PDF'}
          </button>
          <button
            type='button'
            class='markdown-export-toolbar__btn'
            disabled={props.disabled || busy() || !props.host}
            onClick={() => void runExport('png')}
          >
            {exporting.value ? '导出中…' : '导出 PNG'}
          </button>
        </div>

        <ExportPreviewModal
          open={previewOpen.value}
          title={props.previewTitle}
          pages={previewPages.value}
          loading={previewLoading.value}
          error={previewError.value}
          filename={props.filename}
          pdfBlob={previewPdfBlob.value}
          pdf={pdfOptions.value}
          layout={previewLayout.value}
          configurable={props.pdfConfigurable}
          onClose={closePreview}
          onUpdate:pdf={(patch: PdfExportOptions) => void handlePdfConfigChange(patch)}
        />

        <style>{`
          .markdown-export-toolbar {
            display: inline-flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .markdown-export-toolbar__btn {
            padding: 6px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #fff;
            font-size: 13px;
            color: #334155;
            cursor: pointer;
          }
          .markdown-export-toolbar__btn:hover:not(:disabled) {
            background: #f8fafc;
          }
          .markdown-export-toolbar__btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </>
    );
  }
});
