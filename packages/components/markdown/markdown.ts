import { unreachable } from 'devlop';
import {
  toJsxRuntime,
  Options as JsxRuntimeOption
} from 'hast-util-to-jsx-runtime';
import { urlAttributes } from 'html-url-attributes';
import remarkParse from 'remark-parse';
import remarkRehype, { Options as RemarkRehypeOptions } from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { VFile } from 'vfile';

const emptyPlugins = [];
const emptyRemarkRehypeOptions: RemarkRehypeOptions = {
  allowDangerousHtml: true
};
const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i;

// export const markdown_token_raw = 'markdown_token_raw';
export interface MarkdownOptions {
  allowedElements?: string[];
  allowElement?: (node: any, index: number, parent: any) => boolean;
  /** string to code */
  children: string;
  /**local class */
  className?: string;
  /** 需要具体化组件的类型 */
  components?: Record<string, any>;
  disallowedElements?: string[];
  customElements?: string[];
  rehypePlugins?: any[];
  remarkPlugins?: any[];
  remarkRehypeOptions?: object; // 需要具体化选项的类型
  skipHtml?: boolean;
  unwrapDisallowed?: boolean;
  urlTransform?: (url: string, attribute: string, node: any) => string;
}

function createProcessor(options: MarkdownOptions) {
  const rehypePlugins = options.rehypePlugins || emptyPlugins;
  // 获取rehype插件列表，如果未提供则使用空数组
  const remarkPlugins = options.remarkPlugins || emptyPlugins;
  // 获取remark插件列表，如果未提供则使用空数组
  const remarkRehypeOptions = options.remarkRehypeOptions
    ? {
        ...options.remarkRehypeOptions,
        ...emptyRemarkRehypeOptions
      }
    : { ...emptyRemarkRehypeOptions };
  // 合并用户提供的remarkRehype选项和默认选项

  const processor = unified()
    .use(remarkParse)
    .use(remarkPlugins)
    .use(remarkRehype, remarkRehypeOptions)
    .use(rehypePlugins);
  // 创建处理器并配置插件链

  return processor;
  // 返回配置好的处理器
}

function createFile(options: MarkdownOptions) {
  const children = options.children || '';
  // 获取children属性，如果未提供则使用空字符串
  const file = new VFile();
  // 创建新的虚拟文件

  if (typeof children === 'string') {
    file.value = children;
    // 如果children是字符串，则设置为文件内容
  } else {
    unreachable(
      'Unexpected value `' +
        children +
        '` for `children` prop, expected `string`'
    );
    // 如果children不是字符串，则报错
  }

  return file;
  // 返回虚拟文件
}

function post(hastTree, options) {
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
  // Wrap in `div` if there’s a class name.
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
  function transform(node, index, parent) {
    if (node.type === 'raw' && parent && typeof index === 'number') {
      if (skipHtml) {
        parent.children.splice(index, 1);
      } else {
        parent.children[index] = { type: 'text', value: node.value };
      }
      return index;
    }
    // if (
    //   node.type === markdown_token_raw &&
    //   parent &&
    //   typeof index === 'number'
    // ) {
    //   if (skipHtml) {
    //     parent.children.splice(index, 1);
    //   } else {
    //     parent.children[index] = { type: 'text', value: node.value };
    //   }
    //   return index;
    // }

    if (node.type === 'element') {
      let key;
      for (key in urlAttributes) {
        if (
          urlAttributes.hasOwnProperty(key) &&
          node.properties.hasOwnProperty(key)
        ) {
          const value = node.properties[key];
          const test = urlAttributes[key];
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

export function CreateVMarkdown(
  options: MarkdownOptions,
  jsxRuntime: JsxRuntimeOption
) {
  const components = options.components;
  const processor = createProcessor(options);
  const file = createFile(options);
  const mdastTree = processor.parse(file);
  let hastTree = processor.runSync(mdastTree, file);

  hastTree = post(hastTree, options);

  const tree = toJsxRuntime(hastTree, {
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
  return tree;
}

/**
 * Make a URL safe.
 */
export function defaultUrlTransform(value: string) {
  // Same as:
  // <https://github.com/micromark/micromark/blob/929275e/packages/micromark-util-sanitize-uri/dev/index.js#L34>
  // But without the `encode` part.
  const colon = value.indexOf(':');
  const questionMark = value.indexOf('?');
  const numberSign = value.indexOf('#');
  const slash = value.indexOf('/');

  if (
    // If there is no protocol, it’s relative.
    colon < 0 ||
    // If the first colon is after a `?`, `#`, or `/`, it’s not a protocol.
    (slash > -1 && colon > slash) ||
    (questionMark > -1 && colon > questionMark) ||
    (numberSign > -1 && colon > numberSign) ||
    // It is a protocol, it should be allowed.
    safeProtocol.test(value.slice(0, colon))
  ) {
    return value;
  }

  return '';
}
