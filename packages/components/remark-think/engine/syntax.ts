import { codes } from 'micromark-util-symbol';
import { thinkText } from './thinkText';
import { thinkFlow } from './thinkFlow';

/**
 * 创建 micromark 扩展：同时支持块级与行内 think 标签。
 *
 * @param options 插件配置。
 * @returns micromark extension。
 */
export function thinkSyntax(options) {
  return {
    flow: { [codes.lessThan]: thinkFlow(options) },
    text: { [codes.lessThan]: thinkText(options) }
  };
}
