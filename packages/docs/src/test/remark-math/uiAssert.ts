import type { AstUiExpectation } from '../_shared/astUiTypes';
import { assertAstUi } from '../_shared/astUiHelpers';
import type { RemarkMathTestCase } from './types';

/** KaTeX 渲染后的稳定选择器 */
export const UI_SELECTORS = {
  katex: '.katex',
  katexDisplay: '.katex-display'
} as const;

/**
 * 根据 mdast 期望推导默认 UI 期望。
 *
 * @param testCase 用例。
 */
export function buildDefaultUiExpectation(
  testCase: RemarkMathTestCase
): AstUiExpectation {
  const { expect, mathEnabled = true } = testCase;
  const has: AstUiExpectation['has'] = [];
  const missing: string[] = [];
  const textIncludes = [...(expect.contentIncludes ?? [])];
  const textExcludes = [...(expect.contentExcludes ?? [])];

  if (!mathEnabled || expect.noMathNodes) {
    missing.push(UI_SELECTORS.katex, UI_SELECTORS.katexDisplay);
  } else {
    const inline = expect.inlineMathCount ?? 0;
    const block = expect.mathCount ?? 0;
    if (inline + block > 0) {
      has.push({ selector: UI_SELECTORS.katex, min: 1 });
    }
    if (block > 0) {
      has.push({ selector: UI_SELECTORS.katexDisplay, min: block });
    }
  }

  return { has, missing, textIncludes, textExcludes };
}

/**
 * 合并默认与显式 UI 期望。
 *
 * @param testCase 用例。
 */
export function resolveUiExpectation(
  testCase: RemarkMathTestCase
): AstUiExpectation {
  const defaults = buildDefaultUiExpectation(testCase);
  const explicit = testCase.expect.ui;
  if (!explicit) return defaults;
  return {
    has: explicit.has ?? defaults.has,
    missing: explicit.missing ?? defaults.missing,
    textIncludes: explicit.textIncludes ?? defaults.textIncludes,
    textExcludes: explicit.textExcludes ?? defaults.textExcludes
  };
}

/**
 * 对预览根节点做 UI 断言。
 *
 * @param root 预览 DOM。
 * @param testCase 用例。
 */
export function assertRemarkMathUi(
  root: ParentNode,
  testCase: RemarkMathTestCase
): void {
  assertAstUi(root, testCase.id, resolveUiExpectation(testCase));
}
