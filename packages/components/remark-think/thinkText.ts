import { Construct, Effects, State } from 'micromark-util-types';
import { markdownLineEnding } from 'micromark-util-character';
import { codes, types, values } from 'micromark-util-symbol';
import type { ThinkFlowOption } from './type';

// 获取单个字符对应的 micromark code
const getStrCode = (str: string) => {
  const key = Object.keys(values).find((key) => values[key] === str);
  // 动态索引 micromark 内部常量，运行时安全，这里做一次类型断言绕过 TS 限制
  return (codes as any)[key];
};

export function thinkText(options?: ThinkFlowOption): Construct {
  const { tags = ['think'] } = options || {};

  if (!Array.isArray(tags)) {
    throw new Error('tags must be an array of strings');
  }
  if (tags.some((tag) => typeof tag !== 'string')) {
    throw new Error('All tags must be strings');
  }

  return {
    tokenize: tokenizeThinkText,
    resolve: resolveThinkText, // 用于处理和清理从tokenize函数产生的事件列表
    previous,
    name: 'thinkText'
  };

  function tokenizeThinkText(effects: Effects, ok: State, nok: State): State {
    // 保存上下文和状态变量
    // const self = this;
    /** 当前正在匹配的标签 */
    let currentTag = '';
    /** 已经完整匹配到的标签 */
    let matchedTag = '';

    return start; // 返回初始状态函数

    function start(code: number): State {
      // 检查开始标签 <tag>
      if (code !== codes.lessThan) return nok(code); // 如果不是 '<' 字符,返回失败
      (effects as any).enter('thinkText'); // 进入整个 think 标签的 token,包含开始标签、内容和结束标签
      (effects as any).enter('thinkTextSequence'); // 进入 think 标签的开始标签序列 token,只包含 <tag> 这部分
      effects.consume(code); // 消费当前字符
      return tagStart; // 进入 tagStart 状态
    }

    function tagStart(code: number): State {
      currentTag = '';
      matchedTag = '';
      return openTag(code);
    }

    function openTag(code: number): State {
      // 如果当前没有匹配中的标签，尝试开始新的匹配
      if (!currentTag) {
        for (const tag of tags) {
          if (code === getStrCode(tag[0])) {
            currentTag = tag;
            effects.consume(code);
            return openTag;
          }
        }
        return nok(code);
      }

      // 继续匹配当前标签
      const nextIndex = matchedTag.length;
      if (code === getStrCode(currentTag[nextIndex])) {
        effects.consume(code);
        matchedTag += currentTag[nextIndex];
        // 标签匹配完成，期待 '>'
        if (matchedTag.length === currentTag.length) {
          return expectClosingBracket;
        }
        return openTag;
      }

      return nok(code);
    }

    function expectClosingBracket(code: number): State {
      if (code === codes.greaterThan) {
        effects.consume(code);
        (effects as any).exit('thinkTextSequence'); // 退出 thinkTextSequence token
        return between; // 进入 between 状态处理标签内容
      }
      return nok(code);
    }

    function between(code: number): State {
      if (code === codes.eof) {
        return nok(code); // 文件结束符返回失败
      }

      // 检查结束标签开始
      if (code === codes.lessThan) {
        // 如果是 '<' 字符
        (effects as any).enter('thinkTextSequence');
        return closeTagStart;
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
      (effects as any).enter('thinkTextData');
      return data(code);
    }

    function data(code: number): State {
      // 遇到结束符、'<'、空格或换行时退出内容处理
      if (
        code === codes.eof ||
        code === codes.lessThan ||
        code === codes.space ||
        markdownLineEnding(code)
      ) {
        (effects as any).exit('thinkTextData');
        return between(code);
      }

      effects.consume(code); // 消费内容字符
      return data;
    }

    function closeTagStart(code: number): State {
      effects.consume(code); // 已经消费 '<'
      return closeTagSlash;
    }

    function closeTagSlash(code: number): State {
      if (code !== codes.slash) return nok(code); // 如果不是 '/' 返回失败
      effects.consume(code);
      matchedTag = '';
      return closeTag;
    }

    function closeTag(code: number): State {
      // 匹配结束标签文本，例如 </think>
      const tag = currentTag || tags[0];

      const nextIndex = matchedTag.length;
      if (code === getStrCode(tag[nextIndex])) {
        effects.consume(code);
        matchedTag += tag[nextIndex];
        if (matchedTag.length === tag.length) {
          return closeTagEnd;
        }
        return closeTag;
      }

      return nok(code);
    }

    function closeTagEnd(code: number): State {
      if (code === codes.greaterThan) {
        effects.consume(code);
        (effects as any).exit('thinkTextSequence');
        (effects as any).exit('thinkText');
        return ok; // 完整匹配成功返回 ok
      }
      return nok(code);
    }
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
