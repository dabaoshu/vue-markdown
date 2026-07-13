import type { AstUiExpectation } from '../_shared/astUiTypes';
import { assertAstUi } from '../_shared/astUiHelpers';
import type { RehypeMermaidTestCase } from './types';

/** MermaidBlock 默认 class */
export const UI_SELECTORS = {
  mermaidBlock: '.mermaid-block'
} as const;

/**
 * 根据期望推导默认 UI。
 *
 * @param testCase 用例。
 */
export function buildDefaultUiExpectation(
  testCase: RehypeMermaidTestCase
): AstUiExpectation {
  const { expect, mermaidEnabled = true } = testCase;
  const has: AstUiExpectation['has'] = [];
  const missing: string[] = [];
  const textIncludes = [...(expect.contentIncludes ?? [])];
  const textExcludes = [...(expect.contentExcludes ?? [])];

  if (
    !mermaidEnabled ||
    expect.noMermaidFence ||
    (expect.mermaidCodeCount ?? 0) === 0
  ) {
    missing.push(UI_SELECTORS.mermaidBlock);
  } else if ((expect.mermaidCodeCount ?? 0) > 0) {
    has.push({
      selector: UI_SELECTORS.mermaidBlock,
      min: expect.mermaidCodeCount ?? 1
    });
  }

  return { has, missing, textIncludes, textExcludes };
}

/**
 * 合并默认与显式 UI 期望。
 *
 * @param testCase 用例。
 */
export function resolveUiExpectation(
  testCase: RehypeMermaidTestCase
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
export function assertRehypeMermaidUi(
  root: ParentNode,
  testCase: RehypeMermaidTestCase
): void {
  assertAstUi(root, testCase.id, resolveUiExpectation(testCase));
}
