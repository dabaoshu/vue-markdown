/**
 * 把 Markdown 链接 [text](url) 全部变成纯 text
 * 支持一行里有多个链接，也支持嵌套中括号
 */
import _ from 'lodash';
// 1. 链接 → 文字
function mdLinkToText() {
  const complete = (str) => str.replace(/(?<!!)\[([^\]]+)\]\([^)]*\)/g, '$1');
  const incomplete = (str) => str.replace(/(?<!!)\[[^\]]*\]\([^)\s]*$/gm, '');
  return {
    complete,
    incomplete
  };
}

// 2. 图片 → 空
function mdRemoveImage() {
  const complete = (str) => str.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  const incomplete = (str) => str.replace(/!\[[^\]]*\]\([^)\s]*$/gm, '');
  return {
    complete,
    incomplete
  };
  return str.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
}

/* ====== 测试 ====== */
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

const a = `
\`\`\`javascript
  const a = 1;
\`\`\`
`;

const b = `
~~~javascript
  const b = 2;
~~~
`;

const c = `
\`\`\`javascript
  const c = 3;
`;

console.log(
  _.flow(
    removeCodeBlocks().complete,
    mdLinkToText().complete,
    mdRemoveImage().complete
  )(a)
);
// 1.震动速度

//  2 增益曲线 e的x次方

// 3 