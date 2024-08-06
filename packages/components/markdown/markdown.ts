import { unreachable } from 'devlop';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { urlAttributes } from 'html-url-attributes';
import { Fragment, jsx, jsxs } from 'vue-jsx-runtime/jsx-runtime';
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

// 定义一些类型以增强代码的可读性和类型检查
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
  rehypePlugins?: any[];
  remarkPlugins?: any[];
  remarkRehypeOptions?: object; // 需要具体化选项的类型
  skipHtml?: boolean;
  unwrapDisallowed?: boolean;
  urlTransform?: (url: string, attribute: string, node: any) => string;
}
export function Markdown(options: MarkdownOptions) {
  const allowedElements = options.allowedElements;
  const allowElement = options.allowElement;
  const children = options.children || '';
  const className = options.className;
  const components = options.components;
  // console.log(555);

  const disallowedElements = options.disallowedElements;
  const rehypePlugins = options.rehypePlugins || emptyPlugins;
  const remarkPlugins = options.remarkPlugins || emptyPlugins;
  const remarkRehypeOptions = options.remarkRehypeOptions
    ? { ...options.remarkRehypeOptions, ...emptyRemarkRehypeOptions }
    : emptyRemarkRehypeOptions;

  const skipHtml = options.skipHtml;
  const unwrapDisallowed = options.unwrapDisallowed;
  const urlTransform = options.urlTransform || defaultUrlTransform;

  console.log('remarkPlugins', remarkPlugins);
  console.log('rehypePlugins', rehypePlugins);

  const processor = unified()
    .use(remarkParse)
    .use(remarkPlugins)
    .use(remarkRehype, remarkRehypeOptions)
    .use(rehypePlugins)

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

  if (allowedElements && disallowedElements) {
    unreachable(
      'Unexpected combined `allowedElements` and `disallowedElements`, expected one or the other'
    );
  }


  const mdastTree = processor.parse(file);
  let hastTree = processor.runSync(mdastTree, file);

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

  return toJsxRuntime(hastTree, {
    Fragment,
    components,
    ignoreInvalidStyle: true,
    jsx,
    jsxs,
    passKeys: true,
    passNode: true,
    elementAttributeNameCase: 'html'
  });

  function transform(node, index, parent) {
    if (node.type === 'raw' && parent && typeof index === 'number') {
      if (skipHtml) {
        parent.children.splice(index, 1);
      } else {
        parent.children[index] = { type: 'text', value: node.value };
      }

      return index;
    }

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
