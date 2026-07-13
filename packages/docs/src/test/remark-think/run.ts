import { REMARK_THINK_CASES } from './cases';
import { runRemarkThinkCase } from './helpers';
import type { RemarkThinkCaseGroup, RemarkThinkTestCase } from './types';

/**
 * 运行 remark-think 用例集，输出汇总结果。
 *
 * @param cases 要跑的用例，默认全部。
 * @returns 是否全部通过。
 */
export function runRemarkThinkSuite(
  cases: RemarkThinkTestCase[] = REMARK_THINK_CASES
): boolean {
  let passed = 0;
  const failures: Array<{ id: string; message: string }> = [];

  for (const testCase of cases) {
    try {
      runRemarkThinkCase(testCase);
      passed += 1;
      console.log(`✓ ${testCase.id} — ${testCase.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ id: testCase.id, message });
      console.error(`✗ ${testCase.id} — ${testCase.title}`);
      console.error(`  ${message}`);
    }
  }

  console.log('');
  console.log(
    `remark-think: ${passed}/${cases.length} passed` +
      (failures.length ? `, ${failures.length} failed` : '')
  );

  if (failures.length) {
    console.log('\nFailed cases:');
    for (const item of failures) {
      console.log(`- ${item.id}: ${item.message}`);
    }
  }

  return failures.length === 0;
}

/**
 * CLI：支持 `--group=block|inline|merge|multi-tag|mixed|edge`
 */
export function runRemarkThinkCli(argv: string[] = process.argv): never {
  const groupArg = argv.find((arg) => arg.startsWith('--group='));
  const group = groupArg?.slice('--group='.length) as
    | RemarkThinkCaseGroup
    | undefined;

  const cases = group
    ? REMARK_THINK_CASES.filter((item) => item.group === group)
    : REMARK_THINK_CASES;

  if (group && cases.length === 0) {
    console.error(`Unknown or empty group: ${group}`);
    process.exit(1);
  }

  const ok = runRemarkThinkSuite(cases);
  process.exit(ok ? 0 : 1);
}
