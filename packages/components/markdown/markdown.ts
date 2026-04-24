import { Options as JsxRuntimeOption } from 'hast-util-to-jsx-runtime';
import {
  CreateVMarkdown as CreateVMarkdownInEngine,
  defaultUrlTransform,
  type MarkdownOptions
} from './engine/markdown';

export type { MarkdownOptions };
export { defaultUrlTransform };

/**
 * 兼容历史导出命名，内部实现已下沉到 engine 层。
 * @param {MarkdownOptions} options markdown 配置
 * @param {JsxRuntimeOption} jsxRuntime jsx runtime 适配器
 * @returns JSX 树
 */
export function CreateVMarkdown(
  options: MarkdownOptions,
  jsxRuntime: JsxRuntimeOption
) {
  return CreateVMarkdownInEngine(options, jsxRuntime);
}
