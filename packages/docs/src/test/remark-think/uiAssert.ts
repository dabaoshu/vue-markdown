import type {
  RemarkThinkTestCase,
  RemarkThinkUiExpectation,
  RemarkThinkUiSelectorExpect
} from './types';

/** Demo 预览里 think / group / custom 的稳定 class */
export const UI_SELECTORS = {
  think: '.markdown-think',
  thinkGroup: '.thinkGroupElementt',
  custom: '.markdown-custom',
  other: '.markdown-other'
} as const;

/**
 * 规范化选择器期望。
 *
 * @param item 字符串或带 count/min 的对象。
 */
export function normalizeUiSelector(
  item: string | RemarkThinkUiSelectorExpect
): RemarkThinkUiSelectorExpect {
  return typeof item === 'string' ? { selector: item } : item;
}

/**
 * 统计 markdown 中某标签完整开闭对的大致次数（用于 UI min）。
 *
 * @param markdown 源码。
 * @param tag 标签名。
 */
function countTagPairs(markdown: string, tag: string): number {
  const openRe = new RegExp(`<${tag}(?:\\s[^>]*)?>`, 'gi');
  const matches = markdown.match(openRe);
  return matches?.length ?? 0;
}

/**
 * 根据 mdast 期望推导默认 UI 期望（可被用例显式 ui 覆盖）。
 *
 * @param testCase 用例。
 */
export function buildDefaultUiExpectation(
  testCase: RemarkThinkTestCase
): RemarkThinkUiExpectation {
  const { expect, tags = ['think'], merge = false, markdown } = testCase;
  const has: RemarkThinkUiSelectorExpect[] = [];
  const missing: string[] = [];
  const textIncludes = [...(expect.contentIncludes ?? [])];
  const textExcludes = [...(expect.contentExcludes ?? [])];
  let noRawTags = false;

  const thinkPairs = tags.includes('think') ? countTagPairs(markdown, 'think') : 0;
  const customPairs = tags.includes('custom')
    ? countTagPairs(markdown, 'custom')
    : 0;
  const otherPairs = tags.includes('other') ? countTagPairs(markdown, 'other') : 0;

  if (expect.noThinkNodes) {
    missing.push(
      UI_SELECTORS.think,
      UI_SELECTORS.thinkGroup,
      UI_SELECTORS.custom,
      UI_SELECTORS.other
    );
  } else {
    if (thinkPairs > 0 || expect.inlineTagName === 'think') {
      const thinkMin = Math.max(
        thinkPairs,
        expect.inlineTagName === 'think' ? 1 : 0,
        1
      );
      has.push({ selector: UI_SELECTORS.think, min: thinkMin });
      noRawTags = true;
    }

    if (customPairs > 0) {
      has.push({ selector: UI_SELECTORS.custom, min: customPairs });
      noRawTags = true;
    }

    if (otherPairs > 0) {
      has.push({ selector: UI_SELECTORS.other, min: otherPairs });
      noRawTags = true;
    }

    const expectsGroup =
      merge || (expect.thinkGroupCount ?? 0) > 0;
    if (expectsGroup && (thinkPairs > 0 || customPairs > 0 || otherPairs > 0)) {
      has.push({
        selector: UI_SELECTORS.thinkGroup,
        min: Math.max(expect.thinkGroupCount ?? 1, 1)
      });
    } else if (!expectsGroup) {
      missing.push(UI_SELECTORS.thinkGroup);
    }
  }

  return {
    has,
    missing,
    textIncludes,
    textExcludes,
    noRawTags
  };
}

/**
 * 合并默认 UI 期望与用例显式 ui 字段。
 *
 * @param testCase 用例。
 */
export function resolveUiExpectation(
  testCase: RemarkThinkTestCase
): RemarkThinkUiExpectation {
  const defaults = buildDefaultUiExpectation(testCase);
  const explicit = testCase.expect.ui;
  if (!explicit) return defaults;

  return {
    has: explicit.has ?? defaults.has,
    missing: explicit.missing ?? defaults.missing,
    textIncludes: explicit.textIncludes ?? defaults.textIncludes,
    textExcludes: explicit.textExcludes ?? defaults.textExcludes,
    noRawTags: explicit.noRawTags ?? defaults.noRawTags
  };
}

/**
 * 对预览根节点做 UI 断言；失败抛错。
 *
 * @param root 预览 DOM 根节点。
 * @param testCase 用例。
 */
export function assertRemarkThinkUi(
  root: ParentNode,
  testCase: RemarkThinkTestCase
): void {
  const ui = resolveUiExpectation(testCase);
  const text = (root.textContent || '').replace(/\s+/g, ' ').trim();
  const tags = testCase.tags ?? ['think'];

  for (const item of ui.has ?? []) {
    const rule = normalizeUiSelector(item);
    const count = root.querySelectorAll(rule.selector).length;
    if (rule.count !== undefined && count !== rule.count) {
      throw new Error(
        `[${testCase.id}] UI ${rule.selector} 期望 count=${rule.count}，实际 ${count}`
      );
    }
    if (rule.min !== undefined && count < rule.min) {
      throw new Error(
        `[${testCase.id}] UI ${rule.selector} 期望至少 ${rule.min}，实际 ${count}`
      );
    }
    if (rule.count === undefined && rule.min === undefined && count < 1) {
      throw new Error(`[${testCase.id}] UI 缺少选择器 ${rule.selector}`);
    }
  }

  for (const selector of ui.missing ?? []) {
    const count = root.querySelectorAll(selector).length;
    if (count > 0) {
      throw new Error(
        `[${testCase.id}] UI 不应存在 ${selector}，实际 ${count}`
      );
    }
  }

  for (const snippet of ui.textIncludes ?? []) {
    if (!text.includes(snippet)) {
      throw new Error(
        `[${testCase.id}] UI 文本未包含 ${JSON.stringify(snippet)}；实际: ${JSON.stringify(text.slice(0, 200))}`
      );
    }
  }

  for (const snippet of ui.textExcludes ?? []) {
    if (text.includes(snippet)) {
      throw new Error(
        `[${testCase.id}] UI 文本不应包含 ${JSON.stringify(snippet)}`
      );
    }
  }

  if (ui.noRawTags) {
    for (const tag of tags) {
      const open = `<${tag}>`;
      const close = `</${tag}>`;
      if (text.includes(open) || text.includes(close)) {
        throw new Error(
          `[${testCase.id}] UI 仍暴露原始标签文本（${open} / ${close}），说明组件未正确接管渲染`
        );
      }
    }
  }
}
