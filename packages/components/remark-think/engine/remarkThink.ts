import { fromMarkdownThink } from '../adapters/fromMarkdownThink';
import { normalizeThinkOptions } from '../core/options';
import type { ThinkFlowOption } from '../core/type';
import { thinkSyntax } from './syntax';

/**
 * remark 插件入口：注入 think 的 micromark 与 from-markdown 扩展。
 *
 * @param rawOptions 插件配置。
 */
export function remarkThink(rawOptions: ThinkFlowOption) {
  const options = normalizeThinkOptions(rawOptions);
  const data = this.data();

  const micromarkExtensions =
    data.micromarkExtensions || (data.micromarkExtensions = []);
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions || (data.fromMarkdownExtensions = []);

  // 添加 micromark 扩展
  micromarkExtensions.push(thinkSyntax(options));
  // 添加 mdast-util-from-markdown 扩展
  fromMarkdownExtensions.push(fromMarkdownThink(options));
}
