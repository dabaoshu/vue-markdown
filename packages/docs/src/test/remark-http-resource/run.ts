import { REMARK_HTTP_RESOURCE_CASES } from './cases';
import { runRemarkHttpResourceCase } from './helpers';
import { runAstSuiteCli } from '../_shared/astUiHelpers';
import type {
  RemarkHttpResourceCaseGroup,
  RemarkHttpResourceTestCase
} from './types';

/**
 * 运行 AST 套件。
 *
 * @param cases 用例。
 */
export function runRemarkHttpResourceSuite(
  cases: RemarkHttpResourceTestCase[] = REMARK_HTTP_RESOURCE_CASES
): boolean {
  return runAstSuiteCli('remark-http-resource', cases, runRemarkHttpResourceCase);
}

/**
 * CLI：支持 `--group=`。
 *
 * @param argv 参数。
 */
export function runRemarkHttpResourceCli(argv: string[] = process.argv): {
  astOk: boolean;
} {
  const groupArg = argv.find((arg) => arg.startsWith('--group='));
  const group = groupArg?.slice('--group='.length) as
    | RemarkHttpResourceCaseGroup
    | undefined;
  const cases = group
    ? REMARK_HTTP_RESOURCE_CASES.filter((item) => item.group === group)
    : REMARK_HTTP_RESOURCE_CASES;
  if (group && cases.length === 0) {
    console.error(`Unknown or empty group: ${group}`);
    process.exit(1);
  }
  return { astOk: runRemarkHttpResourceSuite(cases) };
}
