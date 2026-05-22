import { defineComponent, ref, PropType } from 'vue';
import type { MarkdownExportHostExpose } from './MarkdownExportHost';

/**
 * 导出工具栏：绑定 MarkdownExportHost 实例，提供 PDF / PNG 导出按钮
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
    }
  },
  emits: ['export-start', 'export-success', 'export-error'],
  setup(props, { emit }) {
    const exporting = ref(false);

    /**
     * 执行导出
     * @param type 导出类型
     */
    const runExport = async (type: 'pdf' | 'png') => {
      if (!props.host || props.disabled || exporting.value) return;

      exporting.value = true;
      emit('export-start', type);

      try {
        const result =
          type === 'pdf'
            ? await props.host.exportPdf(props.filename)
            : await props.host.exportPng(props.filename);
        emit('export-success', result);
      } catch (error) {
        emit('export-error', error);
        console.error('[ExportToolbar] 导出失败', error);
      } finally {
        exporting.value = false;
      }
    };

    return () => (
      <div class='markdown-export-toolbar' data-export-ignore>
        <button
          type='button'
          class='markdown-export-toolbar__btn'
          disabled={props.disabled || exporting.value || !props.host}
          onClick={() => void runExport('pdf')}
        >
          {exporting.value ? '导出中…' : '导出 PDF'}
        </button>
        <button
          type='button'
          class='markdown-export-toolbar__btn'
          disabled={props.disabled || exporting.value || !props.host}
          onClick={() => void runExport('png')}
        >
          {exporting.value ? '导出中…' : '导出 PNG'}
        </button>
      </div>
    );
  }
});
