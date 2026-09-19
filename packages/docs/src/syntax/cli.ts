import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_SYNTAX_ID,
  resolveSyntaxId,
  SYNTAX_EXAMPLES,
  SYNTAX_GROUPS
} from './syntaxExamples';

/**
 * @param name 用例名
 * @param ok 是否通过
 */
function check(name: string, ok: boolean): boolean {
  if (!ok) console.error(`[syntax] FAIL ${name}`);
  else console.log(`[syntax] ok ${name}`);
  return ok;
}

let passed = true;
passed =
  check('default heading', resolveSyntaxId(undefined) === DEFAULT_SYNTAX_ID) &&
  passed;
passed = check('valid table', resolveSyntaxId('table') === 'table') && passed;
passed =
  check('invalid fallback', resolveSyntaxId('gfm') === DEFAULT_SYNTAX_ID) &&
  passed;
passed = check('eleven examples', SYNTAX_EXAMPLES.length === 11) && passed;
passed = check('five groups', SYNTAX_GROUPS.length === 5) && passed;
passed =
  check(
    'unique ids',
    new Set(SYNTAX_EXAMPLES.map((item) => item.id)).size ===
      SYNTAX_EXAMPLES.length
  ) && passed;
passed =
  check(
    'think has tag',
    SYNTAX_EXAMPLES.find((item) => item.id === 'think')?.markdown.includes(
      '<think>'
    ) === true
  ) && passed;
passed =
  check(
    'mermaid fence closed',
    (SYNTAX_EXAMPLES.find((item) => item.id === 'mermaid')?.markdown.match(
      /```/g
    )?.length ?? 0) >= 2
  ) && passed;

const here = dirname(fileURLToPath(import.meta.url));
const docsPackageRoot = resolve(here, '../..');
const appVue = existsSync(resolve(docsPackageRoot, 'src/App.vue'))
  ? readFileSync(resolve(docsPackageRoot, 'src/App.vue'), 'utf8')
  : '';
const routerSrc = existsSync(resolve(docsPackageRoot, 'src/router/index.ts'))
  ? readFileSync(resolve(docsPackageRoot, 'src/router/index.ts'), 'utf8')
  : '';
const pageSrc = existsSync(resolve(docsPackageRoot, 'src/pages/Syntax.vue'))
  ? readFileSync(resolve(docsPackageRoot, 'src/pages/Syntax.vue'), 'utf8')
  : '';
const homeSrc = existsSync(resolve(docsPackageRoot, 'src/pages/Home.vue'))
  ? readFileSync(resolve(docsPackageRoot, 'src/pages/Home.vue'), 'utf8')
  : '';

passed =
  check(
    'nav syntax link',
    appVue.includes('to="/syntax"') && appVue.includes('语法')
  ) && passed;
passed =
  check(
    'router path',
    routerSrc.includes("path: '/syntax'") && routerSrc.includes('Syntax.vue')
  ) && passed;
passed =
  check(
    'page uses renderer',
    pageSrc.includes('MarkdownRenderer') && pageSrc.includes('syntax-preview')
  ) && passed;
passed =
  check(
    'home syntax section',
    homeSrc.includes('Markdown 语法') && homeSrc.includes('openSyntax')
  ) && passed;

process.exit(passed ? 0 : 1);
