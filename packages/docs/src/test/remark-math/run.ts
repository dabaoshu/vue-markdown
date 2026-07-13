import { REMARK_MATH_CASES } from './cases';
import { runRemarkMathCase } from './helpers';
import { runAstSuiteCli } from '../_shared/astUiHelpers';
import type { RemarkMathCaseGroup, RemarkMathTestCase } from './types';

/**
 * 运行 remark-math 用例集。
 *
 * @param cases 用例列表。
 */
export function runRemarkMathSuite(
  cases: RemarkMathTestCase[] = REMARK_MATH_CASES
): boolean {
  return runAstSuiteCli('remark-math', cases, runRemarkMathCase);
}

/**
 * CLI：支持 `--group=inline|block|mixed|edge`
 */
export function runRemarkMathCli(argv: string[] = process.argv): never {
  const groupArg = argv.find((arg) => arg.startsWith('--group='));
  const group = groupArg?.slice('--group='.length) as
    | RemarkMathCaseGroup
    | undefined;

  const cases = group
    ? REMARK_MATH_CASES.filter((item) => item.group === group)
    : REMARK_MATH_CASES;

  if (group && cases.length === 0) {
    console.error(`Unknown or empty group: ${group}`);
    process.exit(1);
  }

  process.exit(runRemarkMathSuite(cases) ? 0 : 1);
}
