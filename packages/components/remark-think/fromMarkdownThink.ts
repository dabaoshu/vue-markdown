// import { types } from 'micromark-util-symbol'; // 常量和类型定义
import { ThinkEvent, ThinkFlowOption } from './type';

export function fromMarkdownThink(option: ThinkFlowOption) {
  let match = false;
  // console.log(option);

  return {
    enter: {
      [ThinkEvent.thinkFlow]: handleThinkOpen,
      // [ThinkEvent.thinkFlowFenceSequence]: handleThinkFenceOpen,
      // [ThinkEvent.thinkFlowCloseFenceSequence]: handleThinkFenceOpen,
      [ThinkEvent.thinkFlowValue]: handleThinkValueOpen
    },
    exit: {
      [ThinkEvent.thinkFlow]: handleThinkClose,
      // [ThinkEvent.thinkFlowFenceSequence]: handleThinkFenceClose,
      [ThinkEvent.thinkFlowValue]: handleThinkValueClose,
      [ThinkEvent.thinkFlowCloseFenceSequence]:
        handlethinkFlowCloseFenceSequence,
      [ThinkEvent.lineEnding]: handleLineEnding
    }
  };

  function handleThinkOpen(token) {
    match = true;
    // const code = {
    //   type: 'thinkFlow',
    //   value: '',
    //   children: [],
    //   data: { _value: '', _tag: '' }
    // };
    // this.enter(
    //   {
    //     type: 'paragraph',
    //     children: [code],
    //     data: {
    //       _value: ''
    //     }
    //   },
    //   token
    // );

    const code = {
      type: 'element',
      meta: {
        loading: true
      },
      value: '',
      tagName: 'think',
      properties: {
        classname: 'thinkContent'
      },
      children: []
    };
    this.enter(
      {
        type: 'thinkFlow',
        meta: null,
        value: '',
        data: { hChildren: [code], value: '', loading: true }
      },
      token
    );
  }
  // 标签内的文本内容
  function handleThinkValueOpen(token) {
    this.buffer(); // Start collecting value content
  }

  function getThinkNode() {
    const node = this.stack[this.stack.length - 1];
    const thinkContentEle = node.data.hChildren[0];
    return thinkContentEle;
  }

  // 获取标签的每行内容类型
  function handleThinkValueClose(token) {
    this.resume(); // Get collected content
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
  function handlethinkFlowCloseFenceSequence(token) {
    // console.log('handlethinkFlowCloseFenceSequence');

    const thinkNode = getThinkNode.call(this);

    thinkNode.meta.loading = false;
  }

  // 获取标签类型
  function handleThinkFenceClose(token) {
    this.resume(); // Get collected content
    const value = this.sliceSerialize(token);
    // console.log('获取标签类型：handleThinkFence_Close', value);
  }

  function handleLineEnding(token) {
    if (match) {
      const value = this.sliceSerialize(token);
      console.log('handleLineEnding_value', value);
      const node = this.stack[this.stack.length - 1];
      const code = {
        type: 'element',
        value: '',
        tagName: 'br',
        properties: { className: ['think-br'] },
        children: []
      };
      const thinkNode = getThinkNode.call(this);
      thinkNode.children.push(code);
      thinkNode.value += value;
      // node.data._value += value;
      return;

      // code.value += value;
    }
    // this.config.exit.lineEnding(token);
  }

  function handleThinkClose(token) {
    const node = this.stack[this.stack.length - 1];
    console.log('完整handleThinkClose', node);

    // const code = node.data.hChildren[0];
    // // 将数据作为文本节点添加到子元素的 children 中
    // code.children.push({ type: 'text', value: this.resume() });

    // const code = node.data.hChildren[0];
    // console.log('handleThinkClose node:', node); // 添加日志
    // code.children.push({ type: 'text', value: node.value || '' });
    this.exit(token);
    match = false;
  }
}
