import { unreachable } from 'devlop';
import {
  Options as JsxRuntimeOption,
  toJsxRuntime
} from 'hast-util-to-jsx-runtime';
import { urlAttributes } from 'html-url-attributes';
import remarkParse from 'remark-parse';
import remarkRehype, { Options as RemarkRehypeOptions } from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { VFile } from 'vfile';
import type { MarkdownOptions } from '../core/types';
import { defaultUrlTransform } from '../core/url';
import { attachMarkdownSource } from '../core/attachMarkdownSource';

export type { MarkdownOptions };
export { defaultUrlTransform };

const emptyPlugins: any[] = [];
const emptyRemarkRehypeOptions: RemarkRehypeOptions = {
  allowDangerousHtml: true
};

/**
 * 创建 unified 处理器。
 * @param {MarkdownOptions} options markdown 配置
 * @returns unified 处理器实例
 */
export function createProcessor(options: MarkdownOptions) {
  const rehypePlugins = options.rehypePlugins || emptyPlugins;
  const remarkPlugins = options.remarkPlugins || emptyPlugins;
  const remarkRehypeOptions = options.remarkRehypeOptions
    ? {
        ...options.remarkRehypeOptions,
        ...emptyRemarkRehypeOptions
      }
    : { ...emptyRemarkRehypeOptions };

  return unified()
    .use(remarkParse)
    .use(remarkPlugins)
    .use(remarkRehype, remarkRehypeOptions)
    .use(attachMarkdownSource)
    .use(rehypePlugins);
}

/**
 * 构建虚拟文件。
 * @param {MarkdownOptions} options markdown 配置
 * @returns {VFile} 虚拟文件
 */
export function createFile(options: MarkdownOptions): VFile {
  const children = options.children || '';
  const file = new VFile();

  if (typeof children === 'string') {
    file.value = children;
  } else {
    unreachable(
      'Unexpected value `' +
        children +
        '` for `children` prop, expected `string`'
    );
  }

  return file;
}

/**
 * 对 HAST 树做后处理。
 * @param {any} hastTree HAST 树
 * @param {MarkdownOptions} options markdown 配置
 * @returns {any} 处理后的 HAST 树
 */
export function postProcessHast(hastTree: any, options: MarkdownOptions): any {
  const allowedElements = options.allowedElements;
  const allowElement = options.allowElement;
  const className = options.className;
  const disallowedElements = options.disallowedElements;
  const skipHtml = options.skipHtml;
  const urlTransform = options.urlTransform || defaultUrlTransform;
  const unwrapDisallowed = options.unwrapDisallowed;

  if (allowedElements && disallowedElements) {
    unreachable(
      'Unexpected combined `allowedElements` and `disallowedElements`, expected one or the other'
    );
  }

  if (className) {
    hastTree = {
      type: 'element',
      tagName: 'div',
      properties: { className },
      children: hastTree.type === 'root' ? hastTree.children : [hastTree]
    } as any;
  }

  visit(hastTree, transform);
  return hastTree;

  function transform(node: any, index: number, parent: any) {
    if (node.type === 'raw' && parent && typeof index === 'number') {
      if (skipHtml) {
        parent.children.splice(index, 1);
      } else {
        parent.children[index] = { type: 'text', value: node.value };
      }
      return index;
    }

    if (node.type === 'element') {
      let key: string;
      for (key in urlAttributes) {
        if (
          Object.prototype.hasOwnProperty.call(urlAttributes, key) &&
          Object.prototype.hasOwnProperty.call(node.properties, key)
        ) {
          const value = node.properties[key];
          const test = (urlAttributes as Record<string, string[] | null>)[key];
          if (test === null || test.includes(node.tagName)) {
            node.properties[key] = urlTransform(String(value || ''), key, node);
          }
        }
      }
    }

    if (node.type === 'element') {
      let remove = allowedElements
        ? !allowedElements.includes(node.tagName)
        : disallowedElements
        ? disallowedElements.includes(node.tagName)
        : false;

      if (!remove && allowElement && typeof index === 'number') {
        remove = !allowElement(node, index, parent);
      }

      if (remove && parent && typeof index === 'number') {
        if (unwrapDisallowed && node.children) {
          parent.children.splice(index, 1, ...node.children);
        } else {
          parent.children.splice(index, 1);
        }
        return index;
      }
    }
  }
}

/**
 * 旧版 markdown 核心实现迁移到 engine 层后的入口。
 * @param {MarkdownOptions} options markdown 配置
 * @param {JsxRuntimeOption} jsxRuntime jsx runtime 适配器
 * @returns JSX 树
 */
export function CreateVMarkdown(
  options: MarkdownOptions,
  jsxRuntime: JsxRuntimeOption
) {
  const components = options.components;
  const processor = createProcessor(options);
  const file = createFile(options);
  const mdastTree = processor.parse(file);
  processor.run(mdastTree, file).then((res) => {
    console.log('mdastTree', res);
  });

  let hastTree = processor.runSync(mdastTree, file);
  hastTree = postProcessHast(hastTree, options);

  return toJsxRuntime(hastTree, {
    components,
    ignoreInvalidStyle: true,
    Fragment: jsxRuntime.Fragment,
    jsx: jsxRuntime.jsx,
    jsxs: jsxRuntime.jsxs,
    passKeys: true,
    passNode: true,
    elementAttributeNameCase: 'html',
    ...jsxRuntime
  });
}

/**
 * 兼容旧命名，保留渲染函数别名。
 * @param {MarkdownOptions} options markdown 配置
 * @param {JsxRuntimeOption} jsxRuntime jsx runtime 适配器
 * @returns JSX 树
 */
export function createVMarkdown(
  options: MarkdownOptions,
  jsxRuntime: JsxRuntimeOption
) {
  return CreateVMarkdown(options, jsxRuntime);
}
