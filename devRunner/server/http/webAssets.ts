/**
 * 内嵌前端资源。开发态为空对象（读磁盘 web/）；打包时由 esbuild 注入。
 */
export interface EmbeddedAsset {
  /** MIME */
  contentType: string;
  /** 文本内容 */
  body: string;
}

/**
 * 路径 -> 资源，例如 `/index.html`
 */
export const WEB_ASSETS: Record<string, EmbeddedAsset> = {};
