import {
  defineComponent,
  ref,
  watch,
  onBeforeUnmount,
  PropType,
  computed
} from 'vue';
import type { ExportPreviewPage, PdfExportOptions } from '../core/types';
import { downloadBlob, resolveFilename } from '../engine/downloadBlob';
import { PDF_PAGE_SIZE_MM } from '../core/pdfPagination';

/**
 * PDF 预览弹层：分页展示截图结果，支持缩放与导出
 */
export const ExportPreviewModal = defineComponent({
  name: 'ExportPreviewModal',
  props: {
    open: {
      type: Boolean,
      required: false,
      default: false
    },
    title: {
      type: String,
      required: false,
      default: 'PDF 预览'
    },
    pages: {
      type: Array as PropType<ExportPreviewPage[]>,
      required: false,
      default: () => []
    },
    loading: {
      type: Boolean,
      required: false,
      default: false
    },
    error: {
      type: String as PropType<string | null>,
      required: false,
      default: null
    },
    filename: {
      type: String,
      required: false,
      default: 'markdown-export'
    },
    pdfBlob: {
      type: Object as PropType<Blob | null>,
      required: false,
      default: null
    },
    /** 当前 PDF 分页配置 */
    pdf: {
      type: Object as PropType<PdfExportOptions>,
      required: false,
      default: () => ({})
    },
    /** 页面尺寸（毫米），用于预览区纸张宽度 */
    layout: {
      type: Object as PropType<{ pageWidthMm: number; pageHeightMm: number } | null>,
      required: false,
      default: null
    },
    /** 是否展示分页配置面板 */
    configurable: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  emits: ['close', 'export', 'update:pdf'],
  setup(props, { emit }) {
    const zoom = ref(100);
    const currentPage = ref(1);

    const pageCount = computed(() => props.pages.length);

    const previewPageWidthMm = computed(
      () => props.layout?.pageWidthMm ?? PDF_PAGE_SIZE_MM.a4.width
    );

    const customWidth = ref(String(props.pdf.customPageSize?.widthMm ?? 210));
    const customHeight = ref(String(props.pdf.customPageSize?.heightMm ?? 297));

    watch(
      () => props.pdf.customPageSize,
      (size) => {
        if (!size) return;
        customWidth.value = String(size.widthMm);
        customHeight.value = String(size.heightMm);
      }
    );

    /**
     * 触发分页配置更新
     * @param patch 增量配置
     */
    const patchPdf = (patch: PdfExportOptions) => {
      emit('update:pdf', patch);
    };

    /**
     * 提交自定义纸张尺寸
     */
    const applyCustomPageSize = () => {
      const widthMm = Number(customWidth.value);
      const heightMm = Number(customHeight.value);
      if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) return;
      if (widthMm <= 0 || heightMm <= 0) return;

      patchPdf({
        pageSize: 'custom',
        customPageSize: { widthMm, heightMm }
      });
    };

    /**
     * 重置弹层内部状态
     */
    const resetState = () => {
      zoom.value = 100;
      currentPage.value = 1;
    };

    watch(
      () => props.open,
      (visible) => {
        if (visible) {
          resetState();
        }
      }
    );

    watch(pageCount, (count) => {
      if (currentPage.value > count) {
        currentPage.value = Math.max(1, count);
      }
    });

    /**
     * 关闭弹层
     */
    const handleClose = () => {
      emit('close');
    };

    /**
     * 下载预览中的 PDF
     */
    const handleExport = () => {
      if (!props.pdfBlob) return;
      const filename = resolveFilename(props.filename, 'pdf');
      downloadBlob(props.pdfBlob, filename);
      emit('export', { filename, blob: props.pdfBlob });
    };

    /**
     * 键盘快捷键：Esc 关闭
     * @param event 键盘事件
     */
    const onKeydown = (event: KeyboardEvent) => {
      if (!props.open) return;
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    watch(
      () => props.open,
      (visible) => {
        if (visible) {
          window.addEventListener('keydown', onKeydown);
        } else {
          window.removeEventListener('keydown', onKeydown);
        }
      },
      { immediate: true }
    );

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', onKeydown);
    });

    /**
     * 滚动到指定页
     * @param pageNumber 页码
     */
    const scrollToPage = (pageNumber: number) => {
      currentPage.value = pageNumber;
      const pageEl = document.getElementById(
        `markdown-export-preview-page-${pageNumber}`
      );
      pageEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return () => {
      if (!props.open) return null;

      return (
        <div
          class='markdown-export-preview'
          role='dialog'
          aria-modal='true'
          aria-label={props.title}
        >
          <div
            class='markdown-export-preview__backdrop'
            onClick={handleClose}
          />
          <div class='markdown-export-preview__panel'>
            <header class='markdown-export-preview__header'>
              <div class='markdown-export-preview__title-wrap'>
                <h2 class='markdown-export-preview__title'>{props.title}</h2>
                {!props.loading && pageCount.value > 0 ? (
                  <span class='markdown-export-preview__meta'>
                    共 {pageCount.value} 页
                  </span>
                ) : null}
              </div>
              <div class='markdown-export-preview__actions'>
                <label class='markdown-export-preview__zoom'>
                  缩放
                  <select
                    value={zoom.value}
                    onChange={(event: Event) => {
                      const target = event.target as HTMLSelectElement;
                      zoom.value = Number(target.value);
                    }}
                  >
                    <option value={60}>60%</option>
                    <option value={80}>80%</option>
                    <option value={100}>100%</option>
                    <option value={120}>120%</option>
                  </select>
                </label>
                <button
                  type='button'
                  class='markdown-export-preview__btn markdown-export-preview__btn--ghost'
                  onClick={handleClose}
                >
                  关闭
                </button>
                <button
                  type='button'
                  class='markdown-export-preview__btn markdown-export-preview__btn--primary'
                  disabled={!props.pdfBlob || props.loading}
                  onClick={handleExport}
                >
                  导出 PDF
                </button>
              </div>
            </header>

            {props.configurable ? (
              <div class='markdown-export-preview__config' data-export-ignore>
                <label class='markdown-export-preview__field'>
                  分页
                  <select
                    value={props.pdf.mode ?? 'paginated'}
                    onChange={(event: Event) => {
                      const target = event.target as HTMLSelectElement;
                      patchPdf({
                        mode: target.value as PdfExportOptions['mode']
                      });
                    }}
                  >
                    <option value='paginated'>自动分页</option>
                    <option value='single'>单页长图</option>
                  </select>
                </label>
                <label class='markdown-export-preview__field'>
                  纸张
                  <select
                    value={props.pdf.pageSize ?? 'a4'}
                    onChange={(event: Event) => {
                      const target = event.target as HTMLSelectElement;
                      const pageSize = target.value as PdfExportOptions['pageSize'];
                      if (pageSize === 'custom') {
                        patchPdf({
                          pageSize: 'custom',
                          customPageSize: {
                            widthMm: Number(customWidth.value) || 210,
                            heightMm: Number(customHeight.value) || 297
                          }
                        });
                        return;
                      }
                      patchPdf({ pageSize });
                    }}
                  >
                    <option value='a4'>A4</option>
                    <option value='letter'>Letter</option>
                    <option value='custom'>自定义</option>
                  </select>
                </label>
                <label class='markdown-export-preview__field'>
                  方向
                  <select
                    value={props.pdf.orientation ?? 'portrait'}
                    disabled={props.pdf.pageSize === 'custom'}
                    onChange={(event: Event) => {
                      const target = event.target as HTMLSelectElement;
                      patchPdf({
                        orientation: target.value as PdfExportOptions['orientation']
                      });
                    }}
                  >
                    <option value='portrait'>纵向</option>
                    <option value='landscape'>横向</option>
                  </select>
                </label>
                <label class='markdown-export-preview__field'>
                  边距
                  <select
                    value={String(props.pdf.marginMm ?? 10)}
                    onChange={(event: Event) => {
                      const target = event.target as HTMLSelectElement;
                      patchPdf({ marginMm: Number(target.value) });
                    }}
                  >
                    <option value='5'>5 mm</option>
                    <option value='10'>10 mm</option>
                    <option value='15'>15 mm</option>
                    <option value='20'>20 mm</option>
                  </select>
                </label>
                {props.pdf.pageSize === 'custom' ? (
                  <>
                    <label class='markdown-export-preview__field'>
                      宽
                      <input
                        type='number'
                        min={1}
                        value={customWidth.value}
                        onInput={(event: Event) => {
                          customWidth.value = (event.target as HTMLInputElement).value;
                        }}
                        onChange={() => applyCustomPageSize()}
                      />
                    </label>
                    <label class='markdown-export-preview__field'>
                      高
                      <input
                        type='number'
                        min={1}
                        value={customHeight.value}
                        onInput={(event: Event) => {
                          customHeight.value = (event.target as HTMLInputElement).value;
                        }}
                        onChange={() => applyCustomPageSize()}
                      />
                    </label>
                  </>
                ) : null}
              </div>
            ) : null}

            <div class='markdown-export-preview__body'>
              {props.loading ? (
                <div class='markdown-export-preview__state'>
                  <div class='markdown-export-preview__spinner' />
                  <p>正在生成预览…</p>
                </div>
              ) : null}

              {!props.loading && props.error ? (
                <div class='markdown-export-preview__state markdown-export-preview__state--error'>
                  <p>{props.error}</p>
                </div>
              ) : null}

              {!props.loading && !props.error && props.pages.length === 0 ? (
                <div class='markdown-export-preview__state'>
                  <p>暂无预览内容</p>
                </div>
              ) : null}

              {!props.loading && !props.error && props.pages.length > 0 ? (
                <div class='markdown-export-preview__pages'>
                  {props.pages.map((page) => (
                    <section
                      key={page.pageNumber}
                      id={`markdown-export-preview-page-${page.pageNumber}`}
                      class='markdown-export-preview__page'
                      style={{
                        width: `${(previewPageWidthMm.value * zoom.value) / 100}mm`
                      }}
                    >
                      <div class='markdown-export-preview__page-label'>
                        第 {page.pageNumber} 页
                      </div>
                      <img
                        class='markdown-export-preview__page-image'
                        src={page.dataUrl}
                        alt={`PDF 预览第 ${page.pageNumber} 页`}
                        draggable={false}
                      />
                    </section>
                  ))}
                </div>
              ) : null}
            </div>

            {!props.loading && pageCount.value > 1 ? (
              <footer class='markdown-export-preview__footer'>
                <button
                  type='button'
                  class='markdown-export-preview__pager-btn'
                  disabled={currentPage.value <= 1}
                  onClick={() => scrollToPage(currentPage.value - 1)}
                >
                  上一页
                </button>
                <span class='markdown-export-preview__pager-info'>
                  {currentPage.value} / {pageCount.value}
                </span>
                <button
                  type='button'
                  class='markdown-export-preview__pager-btn'
                  disabled={currentPage.value >= pageCount.value}
                  onClick={() => scrollToPage(currentPage.value + 1)}
                >
                  下一页
                </button>
              </footer>
            ) : null}
          </div>

          <style>{`
            .markdown-export-preview {
              position: fixed;
              inset: 0;
              z-index: 9999;
              display: flex;
              align-items: stretch;
              justify-content: center;
            }
            .markdown-export-preview__backdrop {
              position: absolute;
              inset: 0;
              background: rgba(15, 23, 42, 0.55);
            }
            .markdown-export-preview__panel {
              position: relative;
              z-index: 1;
              display: flex;
              flex-direction: column;
              width: min(960px, calc(100vw - 32px));
              margin: 16px;
              background: #f1f5f9;
              border-radius: 12px;
              box-shadow: 0 24px 48px rgba(15, 23, 42, 0.24);
              overflow: hidden;
            }
            .markdown-export-preview__header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              padding: 14px 18px;
              background: #fff;
              border-bottom: 1px solid #e2e8f0;
            }
            .markdown-export-preview__title-wrap {
              display: flex;
              align-items: baseline;
              gap: 10px;
              min-width: 0;
            }
            .markdown-export-preview__title {
              margin: 0;
              font-size: 16px;
              font-weight: 600;
              color: #0f172a;
            }
            .markdown-export-preview__meta {
              font-size: 13px;
              color: #64748b;
              white-space: nowrap;
            }
            .markdown-export-preview__actions {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-shrink: 0;
            }
            .markdown-export-preview__zoom {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
              color: #475569;
            }
            .markdown-export-preview__zoom select {
              padding: 4px 8px;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              background: #fff;
            }
            .markdown-export-preview__btn {
              padding: 6px 12px;
              border-radius: 6px;
              border: 1px solid transparent;
              font-size: 13px;
              cursor: pointer;
            }
            .markdown-export-preview__btn:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
            .markdown-export-preview__btn--ghost {
              background: #fff;
              border-color: #cbd5e1;
              color: #334155;
            }
            .markdown-export-preview__btn--primary {
              background: #2563eb;
              color: #fff;
            }
            .markdown-export-preview__config {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              gap: 10px 14px;
              padding: 10px 18px;
              background: #f8fafc;
              border-bottom: 1px solid #e2e8f0;
            }
            .markdown-export-preview__field {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
              color: #475569;
            }
            .markdown-export-preview__field select,
            .markdown-export-preview__field input {
              padding: 4px 8px;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              background: #fff;
              font-size: 13px;
            }
            .markdown-export-preview__field input {
              width: 72px;
            }
            .markdown-export-preview__body {
              flex: 1;
              min-height: 0;
              overflow: auto;
              padding: 24px 20px;
            }
            .markdown-export-preview__state {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 280px;
              color: #64748b;
              font-size: 14px;
            }
            .markdown-export-preview__state--error {
              color: #dc2626;
            }
            .markdown-export-preview__spinner {
              width: 32px;
              height: 32px;
              margin-bottom: 12px;
              border: 3px solid #cbd5e1;
              border-top-color: #2563eb;
              border-radius: 50%;
              animation: markdown-export-preview-spin 0.8s linear infinite;
            }
            @keyframes markdown-export-preview-spin {
              to { transform: rotate(360deg); }
            }
            .markdown-export-preview__pages {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 24px;
            }
            .markdown-export-preview__page {
              position: relative;
              max-width: 100%;
              background: #fff;
              border-radius: 4px;
              box-shadow:
                0 1px 2px rgba(15, 23, 42, 0.08),
                0 8px 24px rgba(15, 23, 42, 0.12);
            }
            .markdown-export-preview__page-label {
              position: absolute;
              top: -22px;
              left: 0;
              font-size: 12px;
              color: #64748b;
            }
            .markdown-export-preview__page-image {
              display: block;
              width: 100%;
              height: auto;
            }
            .markdown-export-preview__footer {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              padding: 10px 16px;
              background: #fff;
              border-top: 1px solid #e2e8f0;
            }
            .markdown-export-preview__pager-btn {
              padding: 4px 10px;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              background: #fff;
              font-size: 13px;
              cursor: pointer;
            }
            .markdown-export-preview__pager-btn:disabled {
              opacity: 0.45;
              cursor: not-allowed;
            }
            .markdown-export-preview__pager-info {
              font-size: 13px;
              color: #475569;
              min-width: 72px;
              text-align: center;
            }
          `}</style>
        </div>
      );
    };
  }
});
