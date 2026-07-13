import { markdownLineEnding } from 'micromark-util-character';
import { codes, types } from 'micromark-util-symbol';
import type { Construct, Effects, State } from 'micromark-util-types';
import { getStrCode } from '../core/tag-code';
import type { ThinkFlowOption } from '../core/type';
import { normalizeThinkOptions } from '../core/options';

/**
 * 创建行内 think 语法解析构造器。
 *
 * @param options 插件配置。
 * @returns micromark 构造器。
 */
export function thinkText(options?: ThinkFlowOption): Construct {
  const { tags } = normalizeThinkOptions(options);

  return {
    tokenize: tokenizeThinkText,
    resolve: resolveThinkText, // 用于处理和清理从 tokenize 函数产生的事件列表
    previous,
    name: 'thinkText'
  };

  function tokenizeThinkText(effects: Effects, ok: State, nok: State): State {
    // 保存上下文和状态变量
    let currentTag = '';
    /** 当前正在匹配 opening tag 的字符下标（首字符匹配后从 1 继续） */
    let openTagIndex = 0;
    /** 当前正在匹配 closing tag 的字符下标 */
    let closeTagIndex = 0;

    return start;

    function start(code: number): State {
      // 检查开始标签 <tag>
      if (code !== codes.lessThan) return nok(code); // 如果不是 '<' 字符,返回失败
      (effects as any).enter('thinkText'); // 进入整个 think 标签 token
      (effects as any).enter('thinkTextSequence'); // 进入 think 标签开始序列 token
      effects.consume(code); // 消费当前字符
      return tagStart; // 进入 tagStart 状态
    }

    function tagStart(code: number): State {
      currentTag = '';
      openTagIndex = 0;
      closeTagIndex = 0;
      return openTag(code);
    }

    function openTag(code: number): State {
      // 如果当前没有匹配中的标签，尝试开始新的匹配
      if (!currentTag) {
        for (const tag of tags) {
          if (code === getStrCode(tag[0])) {
            currentTag = tag;
            effects.consume(code);
            openTagIndex = 1;
            return openTag;
          }
        }
        return nok(code);
      }

      // 继续匹配当前标签
      if (code === getStrCode(currentTag[openTagIndex])) {
        effects.consume(code);
        if (openTagIndex === currentTag.length - 1) {
          return expectClosingBracket;
        }
        openTagIndex++;
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
      // 必须在本轮消费 '<'，否则 micromark(dev) 会断言 expected character to be consumed
      if (code === codes.lessThan) {
        (effects as any).enter('thinkTextSequence');
        effects.consume(code); // 已经消费 '<'
        return closeTagSlash;
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

      // 消费内容字符
      effects.consume(code);
      return data;
    }

    function closeTagSlash(code: number): State {
      if (code !== codes.slash) return nok(code); // 如果不是 '/' 返回失败
      effects.consume(code);
      closeTagIndex = 0;
      return closeTag;
    }

    function closeTag(code: number): State {
      // 匹配结束标签文本，例如 </think>
      const tag = currentTag || tags[0];

      if (code === getStrCode(tag[closeTagIndex])) {
        effects.consume(code);
        if (closeTagIndex === tag.length - 1) {
          return closeTagEnd;
        }
        closeTagIndex++;
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

/**
 * 规范化行内 think token 事件序列，合并相邻文本/空白片段。
 *
 * @param events micromark 事件列表。
 * @returns 处理后的事件列表。
 */
function resolveThinkText(events) {
  let tailExitIndex = events.length - 4;
  let headEnterIndex = 3;
  let index;
  let enter;

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
 * 判断前一个字符是否允许进入行内 think 解析。
 *
 * @param code 当前字符码。
 * @returns 是否允许匹配 thinkText。
 */
function previous(code) {
  return (
    code !== 60 ||
    this.events[this.events.length - 1][1].type === types.characterEscape
  );
}
