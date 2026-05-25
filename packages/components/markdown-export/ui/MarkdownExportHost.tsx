import { defineComponent, ref } from 'vue';
import {
  exportDomAsPdf,
  exportDomAsPng,
  exportFromDom,
  previewFromDom
} from '../engine/exportFromDom';
import type {
  DomExportOptions,
  ExportPreviewResult,
  ExportResult
} from '../core/types';

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
  /** 生成 PDF 分页预览（不下载） */
  previewPdf: (
    filename?: string,
    options?: ExportExtraOptions
  ) => Promise<ExportPreviewResult>;
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

    const requireTarget = (): HTMLElement => {
      const target = rootRef.value;
      if (!target) {
        throw new Error('MarkdownExportHost: 容器尚未挂载');
      }
      return target;
    };

    const previewPdf = (filename?: string, options?: ExportExtraOptions) => {
      return previewFromDom(requireTarget(), options);
    };

    const exportPdf = (filename?: string, options?: ExportExtraOptions) => {
      return exportDomAsPdf(requireTarget(), filename, options);
    };

    const exportPng = (filename?: string, options?: ExportExtraOptions) => {
      return exportDomAsPng(requireTarget(), filename, options);
    };

    const exportMarkdown = (
      options: Omit<DomExportOptions, 'target'>
    ): Promise<ExportResult> => {
      return exportFromDom({ ...options, target: requireTarget() });
    };

    expose({
      getTarget,
      previewPdf,
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
