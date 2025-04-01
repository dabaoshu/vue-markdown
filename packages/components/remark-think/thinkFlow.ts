import { factorySpace } from 'micromark-factory-space'; // 用于处理空格
import { markdownLineEnding } from 'micromark-util-character'; // 用于判断行结束
import { codes, constants, types, values } from 'micromark-util-symbol'; // 常量和类型定义
import { ThinkEvent } from './type';

const getStrCode = (str) => {
  const key = Object.keys(values).find((key) => values[key] === str);
  return codes[key];
};
/**
 * 导出 thinkFlow 构造器
 * tokenize: 用于解析标记的函数
 * concrete: 表示这是一个具体的语法结构
 * name: 构造器名称
 */
export const thinkFlow = (options?) => {
  const { tags = ['think'] } = options || {};
  if (!Array.isArray(tags)) {
    throw new Error('tags must be an array of strings');
  }
  if (tags.some((tag) => typeof tag !== 'string')) {
    throw new Error('All tags must be strings');
  }

  return {
    tokenize: tokenizeThinkFenced,
    concrete: true,
    name: 'thinkFlow'
  };

  /**
   * 主要的标记解析函数
   * @param effects - 用于生成标记的工具
   * @param ok - 解析成功时的回调
   * @param nok - 解析失败时的回调
   */
  function tokenizeThinkFenced(effects, ok, nok) {
    const self = this;
    const tail = self.events[self.events.length - 1];
    // 计算初始缩进大小
    const initialSize =
      tail && tail[1].type === types.linePrefix
        ? tail[2].sliceSerialize(tail[1], true).length
        : 0;
    // 当前匹配的标签索引
    let thinkState = 0;
    // 当前匹配的标签
    let currentTag = '';
    // 匹配到的标签
    let matchedTag = '';

    return start;

    /**
     * 开始解析 think 块
     * 匹配开始标签 <think>
     */
    function start(code) {
      if (code !== codes.lessThan) return nok(code); // 不是 < 则失败
      effects.enter(ThinkEvent.thinkFlow);
      effects.enter(ThinkEvent.thinkFlowFence);
      effects.enter(ThinkEvent.thinkFlowFenceSequence);
      effects.consume(code);
      return tagStart;
    }

    /**
     * 解析开始标签中的 "think" 文本
     * 逐字符匹配 t h i n k
     */
    function tagStart(code) {
      currentTag = '';
      thinkState = 0;
      return openTag(code);
    }

    function openTag(code) {
      // 如果当前没有匹配中的标签，尝试开始新的匹配
      if (!currentTag) {
        for (const tag of tags) {
          if (code === getStrCode(tag[0])) {
            currentTag = tag;
            effects.consume(code);
            thinkState = 1;
            return openTag;
          }
        }
        return nok(code);
      }

      // 继续匹配当前标签
      if (code === getStrCode(currentTag[thinkState])) {
        effects.consume(code);
        if (thinkState === currentTag.length - 1) {
          matchedTag = currentTag;
          return expectClosingBracket;
        }
        thinkState++;
        return openTag;
      }

      return nok(code);
    }

    function expectClosingBracket(code) {
      if (code === codes.greaterThan) {
        effects.consume(code);
        effects.exit(ThinkEvent.thinkFlowFenceSequence);
        return factorySpace(effects, afterOpenSequence, types.whitespace);
      }
      return nok(code);
    }

    /**
     * 开始标签后的处理
     * 处理换行或文件结束的情况
     */
    function afterOpenSequence(code) {
      // 检查是否遇到文件结束符或换行符,如果是则退出围栏标记并继续处理
      if (code === codes.eof || markdownLineEnding(code)) {
        // 退出当前的围栏标记
        effects.exit(ThinkEvent.thinkFlowFence);
        // 如果处于中断状态,直接返回成功
        if (self.interrupt) {
          return ok(code);
        }
        // 尝试继续解析后续内容:
        // - nonLazyContinuation: 处理非懒惰模式的多行内容
        // - beforeContent: 如果继续成功,进入内容处理
        // - after: 如果失败,进入结束处理
        return effects.attempt(nonLazyContinuation, beforeContent, after)(code);
      }

      // 如果既不是文件结束也不是换行,则解析失败
      return nok(code);
    }

    /**
     * 内容开始前的处理
     * 尝试匹配结束标签或开始解析内容
     */
    function beforeContent(code) {
      return effects.attempt(
        { tokenize: tokenizeClosingFence, partial: true },
        after,
        contentStart
      )(code);
    }

    /**
     * 开始解析内容
     * 处理内容的缩进
     */
    function contentStart(code) {
      return (
        initialSize
          ? factorySpace(
              effects,
              beforeContentChunk,
              types.linePrefix,
              initialSize + 1
            )
          : beforeContentChunk
      )(code);
    }

    /**
     * 处理内容块之前
     * 处理文件结束或换行的情况
     */
    function beforeContentChunk(code) {
      if (code === codes.eof) {
        return after(code);
      }

      if (markdownLineEnding(code)) {
        // console.log('markdownLineEnding_enter', code);
        // 尝试匹配非懒惰的继续标记，如果成功则进入 beforeContent 处理，否则进入 after 处理
        return effects.attempt(nonLazyContinuation, beforeContent, after)(code);
      }
      effects.enter(ThinkEvent['thinkFlowValue']);
      return contentChunk(code);
    }

    /**
     * 解析内容块
     * 逐字符处理内容直到遇到换行或文件结束
     */
    function contentChunk(code) {
      if (code === codes.eof || markdownLineEnding(code)) {
        effects.exit(ThinkEvent['thinkFlowValue']);
        return beforeContentChunk(code);
      }
      effects.consume(code);
      return contentChunk;
    }

    /**
     * 结束处理
     */
    function after(code) {
      effects.exit(ThinkEvent.thinkFlow);
      return ok(code);
    }

    /**
     * 解析结束标签
     * 匹配 </think>
     */
    function tokenizeClosingFence(effects, ok, nok) {
      let matched = false;
      let closeThinkState = 0;

      return factorySpace(
        effects,
        closingPrefixAfter,
        types.linePrefix,
        self.parser.constructs.disable.null.includes('codeIndented')
          ? undefined
          : constants.tabSize
      );

      /**
       * 处理结束标签前的空格
       */
      function closingPrefixAfter(code) {
        if (code === codes.lessThan) {
          effects.enter(ThinkEvent.thinkFlowFence);
          effects.enter(ThinkEvent.thinkFlowFenceSequence);
          effects.enter(ThinkEvent.thinkFlowCloseFenceSequence);
          effects.consume(code);
          return closingSlash;
        }
        return nok(code);
      }

      /**
       * 匹配结束标签中的斜杠 /
       */
      function closingSlash(code) {
        if (code === codes.slash) {
          closeThinkState = 0;
          effects.consume(code);
          return closingTag;
        }
        return nok(code);
      }

      /**
       * 匹配结束标签中的 "think" 文本
       */
      function closingTag(code) {
        if (!matchedTag) return nok(code);

        if (code === getStrCode(matchedTag[closeThinkState])) {
          effects.consume(code);
          if (closeThinkState === matchedTag.length - 1) {
            matched = true;
            return closingTagEnd;
          }
          closeThinkState++;
          return closingTag;
        }
        return nok(code);
      }

      /**
       * 处理结束标签的结尾 >
       */
      function closingTagEnd(code) {
        if (code === codes.greaterThan && matched) {
          effects.consume(code);
          effects.exit(ThinkEvent.thinkFlowCloseFenceSequence);
          effects.exit(ThinkEvent.thinkFlowFenceSequence);
          return factorySpace(effects, closingSequenceEnd, types.whitespace);
        }
        return nok(code);
      }

      /**
       * 结束标签后的处理
       */
      function closingSequenceEnd(code) {
        if (code === codes.eof || markdownLineEnding(code)) {
          effects.exit(ThinkEvent.thinkFlowFence);
          return ok(code);
        }
        return nok(code);
      }
    }
  }
};

/**
 * 非懒惰延续构造器
 * 用于处理多行内容
 */
const nonLazyContinuation = {
  tokenize: tokenizeNonLazyContinuation,
  partial: true
};

/**
 * 处理多行内容的延续
 * 确保内容可以跨越多行
 */
function tokenizeNonLazyContinuation(effects, ok, nok) {
  const self = this;
  return start;

  /**
   * 开始处理新行
   */
  /**
   * 处理新行的开始
   * @param code - 当前字符的 ASCII 码
   * @returns 如果遇到文件结束返回 ok，否则处理换行并进入 lineStart 状态
   *
   * 这个函数主要做以下几件事:
   * 1. 检查是否到达文件末尾(code === null)，如果是则结束解析
   * 2. 处理换行符:
   *    - 进入行结束状态(effects.enter)
   *    - 消费当前字符(effects.consume)
   *    - 退出行结束状态(effects.exit)
   * 3. 转入 lineStart 状态继续处理下一行
   *
   * 这样可以确保多行内容能够正确解析，每行都被适当处理
   */
  function start(code) {
    if (code === null) {
      return ok(code);
    }
    // console.log('expected eol');
    effects.enter(ThinkEvent.lineEnding);
    effects.consume(code);
    effects.exit(ThinkEvent.lineEnding);
    return lineStart;
  }

  /**
   * 处理行开始
   * 检查是否是懒惰模式
   */
  /**
   * 处理行开始的函数
   * @param code - 当前字符的 ASCII 码
   * @returns 如果当前行是懒惰模式则返回 nok，否则返回 ok
   *
   * 懒惰模式是 Markdown 解析中的一个概念，表示某些块级内容（如列表、引用等）
   * 在遇到空行或缩进不足时是否要中断解析。
   *
   * 这里检查 parser.lazy 中当前行的标记来判断是否处于懒惰模式。
   * 如果是懒惰模式，说明内容块应该在此中断，返回 nok 结束解析。
   * 如果不是懒惰模式，则返回 ok 继续解析后续内容。
   */
  function lineStart(code) {
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code);
  }
}
