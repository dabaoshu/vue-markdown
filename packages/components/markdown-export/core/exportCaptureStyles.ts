/** 导出截图时注入的修正样式（仅存在于 clone 文档） */
export const EXPORT_CAPTURE_STYLE_ID = 'markdown-export-capture-styles';

/**
 * 导出截图修正 CSS
 * @returns 样式文本
 */
export function getExportCaptureStyleText(): string {
  return `
    .is-export-capturing,
    .is-export-capturing * {
      animation: none !important;
      transition: none !important;
    }

    .is-export-capturing {
      overflow: visible !important;
      max-height: none !important;
    }

    .is-export-capturing [data-export-ignore] {
      display: none !important;
    }

    .is-export-capturing .mermaid-block__loading-mask,
    .is-export-capturing .mermaid-block__stream-pending-mask {
      display: none !important;
    }

    .is-export-capturing pre,
    .is-export-capturing code,
    .is-export-capturing .hljs {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .is-export-capturing table,
    .is-export-capturing th,
    .is-export-capturing td {
      border-collapse: collapse !important;
    }
  `;
}
