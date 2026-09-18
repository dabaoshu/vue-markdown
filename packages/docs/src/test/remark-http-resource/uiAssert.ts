import type { AstUiExpectation } from '../_shared/astUiTypes';
import { assertAstUi } from '../_shared/astUiHelpers';
import type { RemarkHttpResourceTestCase } from './types';

export const UI_SELECTORS = {
  marked: '[data-http-kind]',
  imageKind: '[data-http-kind="image"]',
  documentKind: '[data-http-kind="document"]',
  archiveKind: '[data-http-kind="archive"]',
  audioKind: '[data-http-kind="audio"]',
  videoKind: '[data-http-kind="video"]',
  webpageKind: '[data-http-kind="webpage"]',
  imageEl: 'img[data-http-kind]',
  linkImage: 'a[data-http-kind="image"]',
  ext: '[data-http-ext]'
} as const;

/**
 * 按 kind 生成 DOM 选择器。
 *
 * @param kind 分类 kind。
 */
function kindSelector(kind: string): string {
  switch (kind) {
    case 'image':
      return UI_SELECTORS.imageKind;
    case 'document':
      return UI_SELECTORS.documentKind;
    case 'archive':
      return UI_SELECTORS.archiveKind;
    case 'audio':
      return UI_SELECTORS.audioKind;
    case 'video':
      return UI_SELECTORS.videoKind;
    case 'webpage':
      return UI_SELECTORS.webpageKind;
    default:
      return `[data-http-kind="${kind}"]`;
  }
}

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

  if (testCase.plugin === false || resources.length === 0) {
    missing.push(UI_SELECTORS.marked);
  } else {
    has.push({ selector: UI_SELECTORS.marked, min: resources.length });
    const kinds = new Set(resources.map((item) => item.kind));
    for (const kind of kinds) {
      has.push({
        selector: kindSelector(kind),
        min: resources.filter((item) => item.kind === kind).length
      });
    }
    const imageEls = resources.filter((item) => item.type === 'image');
    const linkImages = resources.filter(
      (item) => item.type === 'link' && item.kind === 'image'
    );
    if (imageEls.length > 0) {
      has.push({ selector: UI_SELECTORS.imageEl, min: imageEls.length });
    }
    if (linkImages.length > 0) {
      has.push({ selector: UI_SELECTORS.linkImage, min: linkImages.length });
    }
    const withExt = resources.filter((item) => item.ext != null);
    const withoutExt = resources.filter((item) => item.ext == null);
    if (withExt.length > 0 && withoutExt.length === 0) {
      has.push({ selector: UI_SELECTORS.ext, min: withExt.length });
    }
    if (withoutExt.length > 0 && withExt.length === 0) {
      missing.push(UI_SELECTORS.ext);
    }
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
