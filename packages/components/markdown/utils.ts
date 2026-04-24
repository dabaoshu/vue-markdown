import rehypeKatex, { Options as RehypeKatexOptions } from 'rehype-katex';
import remarkMath, { Options as RemarkMathOptions } from 'remark-math';
import flow from 'lodash/flow';
import { remarkThink } from '../remark-think';
import type { ThinkFlowOption } from '../remark-think/core/type';

export const preprocessLaTeX = (content: string) => {
  if (typeof content !== 'string') return content;

  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = content.match(codeBlockRegex) || [];
  let processedContent = content.replace(
    codeBlockRegex,
    'CODE_BLOCK_PLACEHOLDER'
  );

  processedContent = flow([
    (str: string) =>
      str.replace(/\\\[(.*?)\\\]/g, (_, equation) => `$$${equation}$$`),
    (str: string) =>
      str.replace(/\\\[(.*?)\\\]/gs, (_, equation) => `$$${equation}$$`),
    (str: string) =>
      str.replace(/\\\((.*?)\\\)/g, (_, equation) => `$$${equation}$$`),
    (str: string) =>
      str.replace(
        /(^|[^\\])\$(.+?)\$/g,
        (_, prefix, equation) => `${prefix}$${equation}$`
      )
  ])(processedContent);

  codeBlocks.forEach((block) => {
    processedContent = processedContent.replace(
      'CODE_BLOCK_PLACEHOLDER',
      block
    );
  });

  return processedContent;
};

export interface PreprocessMathResult {
  remarkPlugins: any[];
  rehypePlugins: any[];
  flow: (content: string) => string;
}

export const preprocessMath = (
  remarkOptions: RemarkMathOptions = {},
  rehypeOptions: RehypeKatexOptions = {}
): PreprocessMathResult => {
  const remarkPlugins = [remarkMath];
  const rehypePlugins = [rehypeKatex];

  return {
    remarkPlugins,
    rehypePlugins,
    flow: preprocessLaTeX
  };
};

export const processThink = (
  remarkOptions?: ThinkFlowOption
  // rehypeOptions?: any
): PreprocessMathResult => {
  const remarkPlugins = [remarkThink, remarkOptions];
  const rehypePlugins = [];
  return {
    remarkPlugins,
    rehypePlugins,
    flow: (t) => t
  };
};
