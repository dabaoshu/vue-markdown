import { REHYPE_MERMAID_CASES } from './cases';
import { runRehypeMermaidCase } from './helpers';
import { runAstSuiteCli } from '../_shared/astUiHelpers';
import type { RehypeMermaidCaseGroup, RehypeMermaidTestCase } from './types';

/**
 * 运行 rehype-mermaid 用例集。
 *
 * @param cases 用例列表。
 */
export function runRehypeMermaidSuite(
  cases: RehypeMermaidTestCase[] = REHYPE_MERMAID_CASES
): boolean {
  return runAstSuiteCli('rehype-mermaid', cases, runRehypeMermaidCase);
}

/**
 * CLI：支持 `--group=flowchart|meta|edge`
 */
export function runRehypeMermaidCli(argv: string[] = process.argv): never {
  const groupArg = argv.find((arg) => arg.startsWith('--group='));
  const group = groupArg?.slice('--group='.length) as
    | RehypeMermaidCaseGroup
    | undefined;

  const cases = group
    ? REHYPE_MERMAID_CASES.filter((item) => item.group === group)
    : REHYPE_MERMAID_CASES;

  if (group && cases.length === 0) {
    console.error(`Unknown or empty group: ${group}`);
    process.exit(1);
  }

  process.exit(runRehypeMermaidSuite(cases) ? 0 : 1);
}
