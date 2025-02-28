import { Construct, Effects, State } from 'micromark-util-types';
import { markdownLineEnding } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';

export function thinkText(options?): Construct {
  const options_ = options || {};

  return {
    tokenize: tokenizeThinkText,
    resolve: resolveThinkText, // 用于处理和清理从tokenize函数产生的事件列表
    previous,
    name: 'thinkText'
  };
}

function tokenizeThinkText(effects: Effects, ok: State, nok: State): State {
  // 保存上下文和状态变量
  const self = this;
  /** @type {Token} */
  let token; // 用于存储token

  return start; // 返回初始状态函数

  function start(code) {
    // 检查开始标签 <think>
    if (code !== codes.lessThan) return nok(code); // 如果不是 '<' 字符,返回失败
    effects.enter('thinkText'); // 进入整个 think 标签的 token,包含开始标签、内容和结束标签
    effects.enter('thinkTextSequence'); // 进入 think 标签的开始标签序列 token,只包含 <think> 这部分
    effects.consume(code); // 消费当前字符
    return openTag; // 进入 openTag 状态
  }

  function openTag(code) {
    // 匹配 "think" 文本,逐字符匹配
    if (code === 116) return effects.consume(code); // 't'
    if (code === 104) return effects.consume(code); // 'h'
    if (code === 105) return effects.consume(code); // 'i'
    if (code === 110) return effects.consume(code); // 'n'
    if (code === 107) return effects.consume(code); // 'k'
    if (code === 62) {
      // 如果是 '>' 字符
      effects.consume(code);
      effects.exit('thinkTextSequence'); // 退出 thinkTextSequence token
      return between; // 进入 between 状态处理标签内容
    }
    return nok(code); // 匹配失败返回 nok
  }

  function between(code) {
    if (code === codes.eof) {
      return nok(code); // 文件结束符返回失败
    }

    // 检查结束标签开始
    if (code === code.lessThan) {
      // 如果是 '<' 字符
      token = effects.enter('thinkTextSequence');
      return closeTagStart(code); // 进入结束标签处理
    }

    // 处理空格
    if (code === codes.space) {
      effects.enter('space');
      effects.consume(code);
      effects.exit('space');
      return between;
    }

    // 处理换行
    if (markdownLineEnding(code)) {
      effects.enter(types.lineEnding);
      effects.consume(code);
      effects.exit(types.lineEnding);
      return between;
    }

    // 处理标签内容
    effects.enter('thinkTextData');
    return data(code);
  }

  function data(code) {
    // 遇到结束符、'<'、空格或换行时退出内容处理
    if (
      code === codes.eof ||
      code === 60 || // '<'
      code === codes.space ||
      markdownLineEnding(code)
    ) {
      effects.exit('thinkTextData');
      return between(code);
    }

    effects.consume(code); // 消费内容字符
    return data;
  }

  function closeTagStart(code) {
    effects.consume(code); // 消费 '<'
    return closeTagSlash;
  }

  function closeTagSlash(code) {
    if (code !== 47) return nok(code); // 如果不是 '/' 返回失败
    effects.consume(code);
    return closeTag;
  }

  function closeTag(code) {
    // 匹配结束标签 "think" 文本
    if (code === 116) return effects.consume(code); // 't'
    if (code === 104) return effects.consume(code); // 'h'
    if (code === 105) return effects.consume(code); // 'i'
    if (code === 110) return effects.consume(code); // 'n'
    if (code === 107) return effects.consume(code); // 'k'
    if (code === 62) {
      // 如果是 '>' 字符
      effects.consume(code);
      effects.exit('thinkTextSequence');
      effects.exit('thinkText');
      return ok; // 完整匹配成功返回 ok
    }
    return nok(code); // 匹配失败返回 nok
  }
}

/** @type {Resolver} */
function resolveThinkText(events) {
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  /** @type {number} */
  let index;
  /** @type {number | undefined} */
  let enter;

  // 处理开始和结束的空格
  if (
    (events[headEnterIndex][1].type === types.lineEnding ||
      events[headEnterIndex][1].type === 'space') &&
    (events[tailExitIndex][1].type === types.lineEnding ||
      events[tailExitIndex][1].type === 'space')
  ) {
    index = headEnterIndex;

    while (++index < tailExitIndex) {
      if (events[index][1].type === 'thinkTextData') {
        events[tailExitIndex][1].type = 'thinkTextPadding';
        events[headEnterIndex][1].type = 'thinkTextPadding';
        headEnterIndex += 2;
        tailExitIndex -= 2;
        break;
      }
    }
  }

  // 合并相邻的空格和数据
  index = headEnterIndex - 1;
  tailExitIndex++;

  while (++index <= tailExitIndex) {
    if (enter === undefined) {
      if (
        index !== tailExitIndex &&
        events[index][1].type !== types.lineEnding
      ) {
        enter = index;
      }
    } else if (
      index === tailExitIndex ||
      events[index][1].type === types.lineEnding
    ) {
      events[enter][1].type = 'thinkTextData';

      if (index !== enter + 2) {
        events[enter][1].end = events[index - 1][1].end;
        events.splice(enter + 2, index - enter - 2);
        tailExitIndex -= index - enter - 2;
        index = enter + 2;
      }

      enter = undefined;
    }
  }

  return events;
}

/**
 * @this {TokenizeContext}
 * @type {Previous}
 */
function previous(code) {
  // 检查是否是转义的开始标签
  return (
    code !== 60 || // '<'
    this.events[this.events.length - 1][1].type === types.characterEscape
  );
}
