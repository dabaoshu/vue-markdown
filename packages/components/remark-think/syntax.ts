import { codes } from 'micromark-util-symbol';
// import { thinkText } from './thinkText.ts';
import { thinkFlow } from './thinkFlow.ts';
// import { Extension } from 'micromark-util-types';
/**
 * Create an extension for `micromark` to enable math syntax.
 *
 * @param {Options | null | undefined} [options={}]
 *   Configuration (default: `{}`).
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions`, to
 *   enable math syntax.
 */
export function thinkSyntax(options) {
  return {
    // flow 用于处理块级的 <think> 标签，比如独占一行或多行的情况
    flow: { [codes.lessThan]: thinkFlow(options) }
    // text 用于处理行内的 <think> 标签，比如在段落中嵌入的情况
    // text: { [codes.lessThan]: thinkText(options) }
  };
}
