import { ThinkEvent, ThinkFlowOption } from '../core/type';

const getStartTag = (text: string, tag: string): number => {
  const regex = new RegExp(`<${tag}[^>]*>`, 'i');
  const match = text.match(regex);
  return match ? match.index : -1;
};

/**
 * 将 micromark token 转换为 mdast/hast 可消费的 think 节点。
 *
 * @param option think 插件配置。
 * @returns from-markdown extension。
 */
export function fromMarkdownThink(option: ThinkFlowOption) {
  let match = false;
  let firstLineEnding = false;
  const tags = option.tags || ['think'];

  return {
    enter: {
      [ThinkEvent.thinkFlow]: handleThinkOpen,
      [ThinkEvent.thinkFlowValue]: handlebuffer,
      [ThinkEvent.thinkFlowFenceSequence]: handlebuffer,
      // 行内 thinkText 的内容缓冲
      thinkTextData: handlebuffer,
      // 行内 <think>...</think> 的整体节点
      thinkText: handleInlineThinkOpen
    },
    exit: {
      [ThinkEvent.thinkFlow]: handleThinkClose,
      [ThinkEvent.thinkFlowValue]: handleThinkValueClose,
      [ThinkEvent.lineEnding]: handleLineEnding,
      [ThinkEvent.thinkFlowFenceSequence]: handleThinkFenceClose,
      thinkTextData: handleInlineThinkValueClose,
      thinkText: handleInlineThinkClose
    }
  };

  // 处理 token 文本内容
  function handlebuffer(token) {
    this.buffer();
  }

  function handleThinkFenceClose(token) {
    this.resume();
    const sequence = this.sliceSerialize(token);
    const regex = new RegExp('<(?!/)(.*?)>', 'ig');
    const node = this.stack[this.stack.length - 1];
    // 只匹配首标签
    if (!node.tagName && sequence && regex.test(sequence)) {
      const innerRegex = new RegExp('<(?!/)(.*?)>', 'ig');
      const obj = innerRegex.exec(sequence);
      const matchedTag = tags.find((tag) => obj[1] === tag);
      if (matchedTag) {
        firstLineEnding = true;
        /** 标识元素体 */
        node.data.hProperties['data-type-remarkThink'] = '';
        const thinkNode = getThinkNode.call(this);

        thinkNode.tagName = matchedTag;
        thinkNode.properties.className = `${matchedTag}_content`;
        node.tagName = matchedTag;
      }
    } else if (node.tagName) {
      handlethinkFlowCloseFenceSequence.call(this);
    }
  }

  function handleThinkOpen(token) {
    match = true;
    const code = {
      type: 'element',
      meta: {
        loading: true
      },
      value: '',
      tagName: '', // 将在解析标签序列时设置
      properties: {},
      children: []
    };
    this.enter(
      {
        type: 'thinkFlow',
        meta: {
          loading: true
        },
        value: '',
        tagName: '',
        properties: {},
        data: {
          hChildren: [code],
          value: '',
          hProperties: {}
        }
      },
      token
    );
  }

  function getThinkNode() {
    const length = this.stack.length;
    const node = this.stack[length - 1];
    if (node.type === 'thinkFlow') {
      const thinkContentEle = node.data.hChildren[0];
      return thinkContentEle;
    }
  }

  function handleThinkValueClose(token) {
    this.resume();
    const value = this.sliceSerialize(token);
    const thinkNode = getThinkNode.call(this);
    thinkNode.children.push({
      type: 'text',
      value
    });
    thinkNode.value += value;
  }

  // 获取结束 thinkFlowCloseFenceSequence
  function handlethinkFlowCloseFenceSequence() {
    const thinkNode = getThinkNode.call(this);
    if (thinkNode) {
      thinkNode.meta.loading = false;
    }
  }

  function handleLineEnding(token) {
    if (match) {
      const value = this.sliceSerialize(token);
      const code = {
        type: 'element',
        value: '',
        tagName: 'br',
        properties: { className: ['think-br'] },
        children: []
      };
      if (firstLineEnding) {
        firstLineEnding = false;
        return;
      }
      const thinkNode = getThinkNode.call(this);
      thinkNode.children.push(code);
      thinkNode.value += value;
      return;
    }
  }

  function handleThinkClose(token) {
    this.exit(token);
    match = false;
  }

  function handleInlineThinkOpen(token) {
    // 行内节点使用 data.hName，确保 remark-rehype 能映射到自定义组件
    const tagName = tags[0] || 'think';
    this.enter(
      {
        type: 'thinkInline',
        meta: {
          loading: true
        },
        value: '',
        tagName,
        data: {
          hName: tagName,
          hProperties: {
            className: [`${tagName}_content`]
          }
        },
        children: []
      },
      token
    );
  }

  function handleInlineThinkValueClose(token) {
    this.resume();
    const value = this.sliceSerialize(token);
    const node = this.stack[this.stack.length - 1];
    if (!node || node.type !== 'thinkInline') return;
    node.children.push({
      type: 'text',
      value
    });
    node.value += value;
  }

  function handleInlineThinkClose(token) {
    const node = this.stack[this.stack.length - 1];
    if (node && node.type === 'thinkInline') {
      node.meta.loading = false;
    }
    this.exit(token);
  }
}
