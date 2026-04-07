/**
 * 把 Markdown 链接 [text](url) 全部变成纯 text
 * 支持一行里有多个链接，也支持嵌套中括号
 */
import _ from 'lodash';
// 1. 链接 → 文字
function mdLinkToText() {
  /**
   * 将 Markdown 链接（[text](url) 形式）全部还原为纯文本内容，即
   * [示例文本](https://example.com) => 示例文本
   */
  /**
   * complete:
   *   - (?<!!)\[([^\]]+)\]\([^)]*\)
   *     详细说明：
   *     - (?<!!)：负前瞻，确保左侧不是 "!"，也就是排除图片语法 ![...](...)
   *     - \[([^\]]+)\]：匹配方括号内的一段内容，即链接显示文字（允许出现任意数量的非 "]" 字符），捕获内容用于替换 ($1)
   *     - \([^)]*\)：紧接着的小括号括起来的内容（即链接的 URL 部分），允许出现任意数量非 ")" 字符
   *     - /g ：全局匹配
   *   - 效果：将所有 Markdown 链接 [text](url) 替换为 [text]（其实此处应该只保留 text），用于「完整」语法场景
   */
  const complete = (str: string): string =>
    str.replace(/(?<!!)\[([^\]]+)\]\([^)]*\)/g, '[$1]');

  /**
   * incomplete:
   *   - (?<!!)\[([^\]]+)\]\([^)\s]*$
   *     详细说明：
   *     - (?<!!)：同理，排除图片
   *     - \[([^\]]+)\]：匹配方括号内文字
   *     - \([^)\s]*$：匹配链接部分以 "(" 开头，内容为一连串非 ")" 或空白字符，直到行尾（即未闭合括号的不完整链接语法）。/gm 表示多行全局处理
   *   - 效果：用于编辑过程中的「不完整」Markdown 链接，防止未闭合时影响解析
   */
  const incomplete = (str: string): string =>
    str.replace(/(?<!!)\[([^\]]+)\]\([^)\s]*$/gm, '[$1]');
  return {
    complete,
    incomplete
  };
}

// 2. 图片 → 空
function mdRemoveImage() {
  /**
   * complete: 移除所有 Markdown 图片语法（包括 `![alt](url)`），将其替换为空字符串。
   * 用于完全匹配和去除所有图片嵌入，表达式说明如下：
   *  - `!\\[[^\\]]*\\]\\([^)]*\\)` 匹配形如 ![描述](链接) 的图片标记
   *  - [^\\]]* 允许描述部分出现任意非 "]" 字符，链接部分允许出现任何非 ")" 字符，尽量通用匹配
   *  - /g 全局替换，不遗漏任何一处图片
   *
   * incomplete: 处理不完整图片语法（如未闭合括号），防止错误数据残留
   *  - `!\\[[^\\]]*\\]\\([^)\s]*$` 匹配以 ![...](... 开头但未闭合的图片语法，常用于编辑时的过渡状态
   *  - /gm 多行模式，逐行查找处理
   */
  const complete = (str: string): string =>
    str.replace(/!\[([^\]]+)\]\([^)]*\)/g, '![$1]');
  const incomplete = (str: string): string =>
    str.replace(/!\[([^\]]+)\]\([^)\s]*$/gm, '![$1]');
  return {
    complete,
    incomplete
  };
}

/* ====== 测试 ====== */
/**
 * 移除 Markdown 代码块（``` 或 ~~~）
 *
 * @returns {{ complete: (str: string) => string; incomplete: (str: string) => string }}
 */
const removeCodeBlocks = () => {
  const complete = (str) =>
    str.replace(/^ {0,3}(```+|~~~+).*?\n[\s\S]*?^\1\s*$/gm, '');
  const incomplete = (str) =>
    str.replace(/^ {0,3}(```+|~~~+).*?(?:\n[\s\S]*)?$/gm, '');
  return {
    complete,
    incomplete
  };
};

/**
 * 移除数学公式块（$$ ... $$）
 *
 * @returns {{ complete: (str: string) => string; incomplete: (str: string) => string }}
 */
const removeMathBlocks = () => {
  const complete = (str) =>
    // 正则解释：
    // ^ {0,3}    ： 匹配行首最多3个空格（可没有），目的是兼容不同缩进层级的Math块
    // \$\$        ： 匹配 $$，即Math块的开始标记
    // [\s\S]*?    ： 非贪婪地匹配所有字符（包括换行），直到下一个Math块的结束
    // ^ {0,3}\$\$\s*$ ：紧接着再次匹配行首（最多有3个空格）、$$，并允许行尾有空白字符，然后以行尾结束，这通常表示Math块的结束标记
    // /gm         ：g为全局匹配，m为多行匹配，使 ^ 和 $ 匹配每行的行首和行尾
    str.replace(/^ {0,3}\$\$[\s\S]*?^ {0,3}\$\$\s*$/gm, '');
  const incomplete = (str) => str.replace(/^ {0,3}\$\$[\s\S]*$/gm, '');
  return {
    complete,
    incomplete
  };
};

/**
 * 移除以 `|` 开头、以换行结束的整行内容
 *
 * @returns {{ complete: (str: string) => string; incomplete: (str: string) => string }}
 */
const removePipeLines = () => {
  const complete = (str) => str.replace(/^\|.*(?:\n|$)/gm, '');
  const incomplete = (str) => str.replace(/^\|.*(?:\n|$)/gm, '');
  return {
    complete,
    incomplete
  };
};

/**
 * 完整内容管道（流结束或一次性清洗）
 *
 * @returns {(s: string) => string}
 */
function pipelineComplete(): (s: string) => string {
  return _.flow(
    removeCodeBlocks().complete,
    removeMathBlocks().complete,
    removePipeLines().complete,
    mdLinkToText().complete,
    mdRemoveImage().complete
  );
}

/**
 * 流式过程中使用的管道（未闭合语法友好）
 *
 * @returns {(s: string) => string}
 */
function pipelineIncomplete(): (s: string) => string {
  return _.flow(
    removeCodeBlocks().incomplete,
    removeMathBlocks().incomplete,
    removePipeLines().incomplete,
    mdLinkToText().incomplete,
    mdRemoveImage().incomplete
  );
}
export const pileCall = (text: string) => {
  const text2 = pipelineComplete()(text);
  return pipelineIncomplete()(text2);
};

// const { incomplete } = mdLinkToText();
// console.log('[test](test) =>', incomplete('[test](test)'));
// console.log('[test11] =>', incomplete('[test11'));
// console.log('[test(te =>', incomplete('[test](te'));

// console.log('[test](test)aaa =>', incomplete('[test](test)aaa'));
// console.log('[test](test)aaa =>', incomplete('[test](test)aaa'));

const { incomplete } = mdRemoveImage();
console.group('mdRemoveImage');
console.log('![test](test) =>', incomplete('![test](test)'));
console.log('![test](test =>', incomplete('![test](test'));
console.log('![testaaa =>', incomplete('![testaaa'),);
console.log('![test(te =>', incomplete('![test(te'));
console.log('![test](test)aaa =>', incomplete('![test](test)aaa'));
console.log('![test](test)aaa =>', incomplete('![test](test)aaa'));
console.groupEnd();