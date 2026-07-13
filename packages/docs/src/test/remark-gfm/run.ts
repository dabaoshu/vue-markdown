import { REMARK_GFM_CASES } from './cases';
import { runRemarkGfmCase } from './helpers';
import { runAstSuiteCli } from '../_shared/astUiHelpers';
import type { RemarkGfmCaseGroup, RemarkGfmTestCase } from './types';

/**
 * 运行 remark-gfm 用例集。
 *
 * @param cases 要跑的用例，默认全部。
 */
export function runRemarkGfmSuite(
  cases: RemarkGfmTestCase[] = REMARK_GFM_CASES
): boolean {
  return runAstSuiteCli('remark-gfm', cases, runRemarkGfmCase);
}

/**
 * CLI：支持 `--group=table|task|strike|link|breaks|edge`
 */
export function runRemarkGfmCli(argv: string[] = process.argv): never {
  const groupArg = argv.find((arg) => arg.startsWith('--group='));
  const group = groupArg?.slice('--group='.length) as
    | RemarkGfmCaseGroup
    | undefined;

  const cases = group
    ? REMARK_GFM_CASES.filter((item) => item.group === group)
    : REMARK_GFM_CASES;

  if (group && cases.length === 0) {
    console.error(`Unknown or empty group: ${group}`);
    process.exit(1);
  }

  const ok = runRemarkGfmSuite(cases);
  process.exit(ok ? 0 : 1);
}
