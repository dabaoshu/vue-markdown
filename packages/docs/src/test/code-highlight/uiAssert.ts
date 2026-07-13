import type { AstUiExpectation } from '../_shared/astUiTypes';
import { assertAstUi } from '../_shared/astUiHelpers';
import type { CodeHighlightTestCase } from './types';

/** CodeBlock / CodeHighLight 稳定选择器（兼容 CSS Modules hash） */
export const UI_SELECTORS = {
  codeBlock: '[class*="code-block"]',
  hljs: 'code.hljs',
  languageLabel: '[class*="code-language"]'
} as const;

/**
 * 根据期望推导默认 UI。
 *
 * @param testCase 用例。
 */
export function buildDefaultUiExpectation(
  testCase: CodeHighlightTestCase
): AstUiExpectation {
  const { expect, highlight = true } = testCase;
  const has: AstUiExpectation['has'] = [];
  const missing: string[] = [];
  const textIncludes = [
    ...(expect.contentIncludes ?? []),
    ...(expect.codeValueIncludes ?? [])
  ];
  const textExcludes = [...(expect.contentExcludes ?? [])];

  if (!highlight || expect.noCodeFence || (expect.codeCount ?? 0) === 0) {
    missing.push(UI_SELECTORS.codeBlock, UI_SELECTORS.hljs);
  } else if ((expect.codeCount ?? 0) > 0) {
    has.push({
      selector: UI_SELECTORS.codeBlock,
      min: expect.codeCount ?? 1
    });
    has.push({ selector: UI_SELECTORS.hljs, min: 1 });
  }

  return { has, missing, textIncludes, textExcludes };
}

/**
 * 合并默认与显式 UI 期望。
 *
 * @param testCase 用例。
 */
export function resolveUiExpectation(
  testCase: CodeHighlightTestCase
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
 * UI 断言。
 *
 * @param root 预览 DOM。
 * @param testCase 用例。
 */
export function assertCodeHighlightUi(
  root: ParentNode,
  testCase: CodeHighlightTestCase
): void {
  assertAstUi(root, testCase.id, resolveUiExpectation(testCase));
}
