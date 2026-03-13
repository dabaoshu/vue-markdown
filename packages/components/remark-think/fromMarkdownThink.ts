// import { types } from 'micromark-util-symbol'; // 常量和类型定义
import { ThinkEvent, ThinkFlowOption } from './type';

const getStartTag = (text: string, tag: string): number => {
  const regex = new RegExp(`<${tag}[^>]*>`, 'i');
  const match = text.match(regex);
  return match ? match.index : -1;
};

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
      // [ThinkEvent.thinkFlowCloseFenceSequence]:
      //   handlethinkFlowCloseFenceSequence,
      [ThinkEvent.lineEnding]: handleLineEnding,
      [ThinkEvent.thinkFlowFenceSequence]: handleThinkFenceClose,
      thinkTextData: handleInlineThinkValueClose,
      thinkText: handleInlineThinkClose
    }
  };

  // 处理token文本内容
  function handlebuffer(token) {
    this.buffer();
  }

  /** */
  function handleThinkFenceClose(token) {
    this.resume();
    const sequence = this.sliceSerialize(token);
    // console.log('handleThinkFenceClose', { sequence, tags });
    const regex = new RegExp('<(?!/)(.*?)>', 'ig');
    const node = this.stack[this.stack.length - 1];
    // 只匹配首标签
    if (!node.tagName && sequence && regex.test(sequence)) {
      const regex = new RegExp('<(?!/)(.*?)>', 'ig');
      const obj = regex.exec(sequence);
      // 这是开始标签
      const matchedTag = tags.find((tag) => obj[1] === tag);
      if (matchedTag) {
        firstLineEnding = true;
        /**标识元素体 */
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
      properties: {
        // classname: ''
      },
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
          hProperties: {},
          // hName: 'thinkFlow'
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

  // 获取标签的每行内容类型
  function handleThinkValueClose(token) {
    // console.log('handleThinkValueClose--1', this.stack[this.stack.length - 1]);
    this.resume(); // Get collected content
    // console.log('handleThinkValueClose--2', this.stack[this.stack.length - 1]);
    const value = this.sliceSerialize(token);
    const thinkNode = getThinkNode.call(this);
    thinkNode.children.push({
      type: 'text',
      value: value
    });
    thinkNode.value += value;
    // node.data._value += value;

    // const code = node.data.hChildren[0];
    // code.value += value;
  }

  // 获取结束thinkFlowCloseFenceSequence
  function handlethinkFlowCloseFenceSequence() {
    const thinkNode = getThinkNode.call(this);
    if (thinkNode) {
      // console.log('在加载结束');
      thinkNode.meta.loading = false;
    } else {
      // this.stack
      // console.log('在加载中');
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
    const node = this.stack[this.stack.length - 1];
    // const code = node.data.hChildren[0];
    // // 将数据作为文本节点添加到子元素的 children 中
    // code.children.push({ type: 'text', value: this.resume() });

    // const code = node.data.hChildren[0];
    // console.log('handleThinkClose node:', node); // 添加日志
    // code.children.push({ type: 'text', value: node.value || '' });
    this.exit(token);
    match = false;
  }

  /**
   * 行内 thinkText 相关处理
   * `<think>1</think>` 会被解析为一个行内 element 节点
   */
  function handleInlineThinkOpen(token) {
    // 行内节点直接作为 element 插入，不包裹 thinkFlow
    this.enter(
      {
        type: 'element',
        meta: {
          loading: true
        },
        value: '',
        tagName: tags[0] || 'think',
        properties: {
          className: [`${tags[0] || 'think'}_content`]
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
    if (!node || node.type !== 'element') return;
    node.children.push({
      type: 'text',
      value
    });
    node.value += value;
  }

  function handleInlineThinkClose(token) {
    const node = this.stack[this.stack.length - 1];
    if (node && node.type === 'element') {
      node.meta.loading = false;
    }
    this.exit(token);
  }
}
