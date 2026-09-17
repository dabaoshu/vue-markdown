import type { AstUiExpectation } from '../_shared/astUiTypes';
import { assertAstUi } from '../_shared/astUiHelpers';
import type { RemarkHttpResourceTestCase } from './types';

export const UI_SELECTORS = {
  kind: '[data-http-kind]',
  imageKind: '[data-http-kind="image"]',
  documentKind: '[data-http-kind="document"]',
  webpageKind: '[data-http-kind="webpage"]'
} as const;

/**
 * 按 AST expect.resources 推导默认 UI。
 *
 * @param testCase 用例。
 */
export function buildDefaultUiExpectation(
  testCase: RemarkHttpResourceTestCase
): AstUiExpectation {
  const resources = testCase.expect.resources ?? [];
  const has: AstUiExpectation['has'] = [];
  const missing: string[] = [];
  if (resources.length > 0) {
    has.push({ selector: UI_SELECTORS.kind, min: resources.length });
  } else {
    missing.push(UI_SELECTORS.kind);
  }
  return {
    has,
    missing,
    textIncludes: [...(testCase.expect.contentIncludes ?? [])]
  };
}

/**
 * 合并显式 ui。
 *
 * @param testCase 用例。
 */
export function resolveUiExpectation(
  testCase: RemarkHttpResourceTestCase
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
 * 对预览根做 UI 断言。
 *
 * @param root 预览 DOM。
 * @param testCase 用例。
 */
export function assertRemarkHttpResourceUi(
  root: ParentNode,
  testCase: RemarkHttpResourceTestCase
): void {
  assertAstUi(root, testCase.id, resolveUiExpectation(testCase));
}
