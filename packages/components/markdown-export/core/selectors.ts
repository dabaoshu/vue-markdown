/** 导出等待：存在则阻塞截图 */
export const EXPORT_LOADING_SELECTOR = '[data-export-loading]';

/** 导出就绪：存在则必须全部满足后再截图 */
export const EXPORT_READY_SELECTOR = '[data-export-ready="true"]';

/** 导出时隐藏的元素 */
export const EXPORT_IGNORE_SELECTOR = '[data-export-ignore]';

/** 导出时强制展开的内容 */
export const EXPORT_EXPAND_SELECTOR = '[data-export-expand]';

/** Mermaid 图表 SVG 容器 */
export const MERMAID_SVG_SELECTOR = '.mermaid-block svg, .mermaid-block__surface svg';
