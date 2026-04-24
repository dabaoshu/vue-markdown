/**
 * Markdown 渲染配置项。
 */
export interface MarkdownOptions {
  allowedElements?: string[];
  allowElement?: (node: any, index: number, parent: any) => boolean;
  /**
   * Markdown 原文。
   */
  children: string;
  /**
   * 根节点 class。
   */
  className?: string;
  /**
   * 自定义组件映射表。
   */
  components?: Record<string, any>;
  disallowedElements?: string[];
  rehypePlugins?: any[];
  remarkPlugins?: any[];
  /**
   * remark-rehype 的额外配置。
   */
  remarkRehypeOptions?: object;
  skipHtml?: boolean;
  unwrapDisallowed?: boolean;
  urlTransform?: (url: string, attribute: string, node: any) => string;
}
