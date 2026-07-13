import type { AstUiExpectation } from '../_shared/astUiTypes';
import { assertAstUi } from '../_shared/astUiHelpers';
import type { RemarkGfmTestCase } from './types';

/** GFM / breaks 预览中较稳定的 DOM 选择器 */
export const UI_SELECTORS = {
  table: 'table',
  del: 'del',
  checkbox: 'input[type="checkbox"]',
  br: 'br',
  link: 'a[href]'
} as const;

/**
 * 根据 mdast 期望推导默认 UI 期望。
 *
 * @param testCase 用例。
 */
export function buildDefaultUiExpectation(
  testCase: RemarkGfmTestCase
): AstUiExpectation {
  const { expect, breaks = false, gfm = true } = testCase;
  const has: AstUiExpectation['has'] = [];
  const missing: string[] = [];
  const textIncludes = [...(expect.contentIncludes ?? [])];
  const textExcludes = [...(expect.contentExcludes ?? [])];

  if (expect.noTable || expect.tableCount === 0) {
    missing.push(UI_SELECTORS.table);
  } else if ((expect.tableCount ?? 0) > 0) {
    has.push({
      selector: UI_SELECTORS.table,
      min: expect.tableCount ?? 1
    });
  }

  if (expect.noDelete) {
    missing.push(UI_SELECTORS.del);
  } else if ((expect.deleteCount ?? 0) > 0) {
    has.push({
      selector: UI_SELECTORS.del,
      min: expect.deleteCount ?? 1
    });
  }

  const taskCount =
    (expect.checkedTrueCount ?? 0) + (expect.checkedFalseCount ?? 0);
  if (taskCount > 0) {
    has.push({ selector: UI_SELECTORS.checkbox, min: taskCount });
  }

  if ((expect.linkCount ?? 0) > 0) {
    has.push({ selector: UI_SELECTORS.link, min: expect.linkCount ?? 1 });
  }

  if (breaks && (expect.breakCount ?? 0) > 0) {
    has.push({ selector: UI_SELECTORS.br, min: expect.breakCount ?? 1 });
  }

  if (!gfm && expect.noTable) {
    if (!missing.includes(UI_SELECTORS.table)) missing.push(UI_SELECTORS.table);
  }

  return { has, missing, textIncludes, textExcludes };
}

/**
 * 合并默认 UI 期望与用例显式 ui。
 *
 * @param testCase 用例。
 */
export function resolveUiExpectation(
  testCase: RemarkGfmTestCase
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
export function assertRemarkGfmUi(
  root: ParentNode,
  testCase: RemarkGfmTestCase
): void {
  assertAstUi(root, testCase.id, resolveUiExpectation(testCase));
}
