export type {
  CodeHighlightCaseGroup,
  CodeHighlightExpectation,
  CodeHighlightTestCase
} from './types';
export { CODE_HIGHLIGHT_CASES, getCodeHighlightCases } from './cases';
export {
  assertCodeHighlightCase,
  evaluateCodeHighlightCase,
  parseCodeMarkdown,
  runCodeHighlightCase,
  treeToDisplayJson
} from './helpers';
export type { CodeHighlightCaseResult, TestTreeNode } from './helpers';
export {
  UI_SELECTORS,
  assertCodeHighlightUi,
  buildDefaultUiExpectation,
  resolveUiExpectation
} from './uiAssert';
export { runCodeHighlightSuite, runCodeHighlightCli } from './run';
export { mergeUiResult } from '../_shared/astUiHelpers';
