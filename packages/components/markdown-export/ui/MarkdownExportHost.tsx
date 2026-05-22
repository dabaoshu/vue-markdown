import { defineComponent, ref } from 'vue';
import {
  exportDomAsPdf,
  exportDomAsPng,
  exportFromDom,
  type DomExportOptions,
  type ExportResult
} from '../engine/exportFromDom';

type ExportExtraOptions = Omit<
  DomExportOptions,
  'target' | 'format' | 'filename'
>;

/**
 * MarkdownExportHost 暴露的方法
 */
export interface MarkdownExportHostExpose {
  /** 获取导出容器 DOM */
  getTarget: () => HTMLElement | null;
  /** 导出 PDF */
  exportPdf: (
    filename?: string,
    options?: ExportExtraOptions
  ) => Promise<ExportResult>;
  /** 导出 PNG 长图 */
  exportPng: (
    filename?: string,
    options?: ExportExtraOptions
  ) => Promise<ExportResult>;
  /** 通用导出 */
  export: (options: Omit<DomExportOptions, 'target'>) => Promise<ExportResult>;
}

/**
 * Markdown 导出宿主：包裹已渲染内容，提供 DOM 截图导出入口
 */
export const MarkdownExportHost = defineComponent({
  name: 'MarkdownExportHost',
  props: {
    className: {
      type: String,
      required: false,
      default: 'markdown-export-host'
    }
  },
  setup(props, { slots, expose }) {
    const rootRef = ref<HTMLElement | null>(null);

    const getTarget = () => rootRef.value;

    const exportPdf = (filename?: string, options?: ExportExtraOptions) => {
      const target = rootRef.value;
      if (!target) {
        return Promise.reject(new Error('MarkdownExportHost: 容器尚未挂载'));
      }
      return exportDomAsPdf(target, filename, options);
    };

    const exportPng = (filename?: string, options?: ExportExtraOptions) => {
      const target = rootRef.value;
      if (!target) {
        return Promise.reject(new Error('MarkdownExportHost: 容器尚未挂载'));
      }
      return exportDomAsPng(target, filename, options);
    };

    const exportMarkdown = (
      options: Omit<DomExportOptions, 'target'>
    ): Promise<ExportResult> => {
      const target = rootRef.value;
      if (!target) {
        return Promise.reject(new Error('MarkdownExportHost: 容器尚未挂载'));
      }
      return exportFromDom({ ...options, target });
    };

    expose({
      getTarget,
      exportPdf,
      exportPng,
      export: exportMarkdown
    } satisfies MarkdownExportHostExpose);

    return () => (
      <div ref={rootRef} class={props.className}>
        {slots.default?.()}
      </div>
    );
  }
});
