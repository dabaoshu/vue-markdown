import { CODE_HIGHLIGHT_CASES } from './cases';
import { runCodeHighlightCase } from './helpers';
import { runAstSuiteCli } from '../_shared/astUiHelpers';
import type { CodeHighlightCaseGroup, CodeHighlightTestCase } from './types';

/**
 * 运行 code-highlight 用例集。
 *
 * @param cases 用例列表。
 */
export function runCodeHighlightSuite(
  cases: CodeHighlightTestCase[] = CODE_HIGHLIGHT_CASES
): boolean {
  return runAstSuiteCli('code-highlight', cases, runCodeHighlightCase);
}

/**
 * CLI：支持 `--group=fence|lang|inline|edge`
 */
export function runCodeHighlightCli(argv: string[] = process.argv): never {
  const groupArg = argv.find((arg) => arg.startsWith('--group='));
  const group = groupArg?.slice('--group='.length) as
    | CodeHighlightCaseGroup
    | undefined;

  const cases = group
    ? CODE_HIGHLIGHT_CASES.filter((item) => item.group === group)
    : CODE_HIGHLIGHT_CASES;

  if (group && cases.length === 0) {
    console.error(`Unknown or empty group: ${group}`);
    process.exit(1);
  }

  process.exit(runCodeHighlightSuite(cases) ? 0 : 1);
}
