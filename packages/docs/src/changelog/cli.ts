import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseChangelog, splitInlineCode } from './parseChangelog';

/**
 * @param name 用例名
 * @param ok 是否通过
 */
function check(name: string, ok: boolean): boolean {
  if (!ok) console.error(`[changelog] FAIL ${name}`);
  else console.log(`[changelog] ok ${name}`);
  return ok;
}

const here = dirname(fileURLToPath(import.meta.url));
/** `packages/docs` 包根 */
const docsPackageRoot = resolve(here, '../..');
const changelogPath = resolve(docsPackageRoot, '../../CHANGELOG.md');

let passed = true;
passed = check('file exists', existsSync(changelogPath)) && passed;

const text = existsSync(changelogPath)
  ? readFileSync(changelogPath, 'utf8')
  : '';

passed = check('file non-empty', text.trim().length > 0) && passed;
passed =
  check('no Unreleased section', text.includes('## [Unreleased]') === false) &&
  passed;
passed =
  check('has 1.0.5 date', text.includes('## [1.0.5] - 2026-09-08')) &&
  passed;
passed =
  check(
    'docs-only excluded',
    text.includes('文档站') && text.includes('不记')
  ) && passed;
passed =
  check(
    'earlier versions note',
    text.includes('1.0.4') && text.includes('未公开完整日志')
  ) && passed;

const appVuePath = resolve(docsPackageRoot, 'src/App.vue');
const routerPath = resolve(docsPackageRoot, 'src/router/index.ts');
const pagePath = resolve(docsPackageRoot, 'src/pages/Changelog.vue');

const appVue = existsSync(appVuePath) ? readFileSync(appVuePath, 'utf8') : '';
const routerSrc = existsSync(routerPath)
  ? readFileSync(routerPath, 'utf8')
  : '';
const pageSrc = existsSync(pagePath) ? readFileSync(pagePath, 'utf8') : '';

passed =
  check(
    'nav changelog link',
    appVue.includes('to="/changelog"') && appVue.includes('更新日志')
  ) && passed;
passed =
  check('router path', routerSrc.includes("path: '/changelog'")) && passed;
passed =
  check(
    'page raw import',
    pageSrc.includes('@repo/CHANGELOG.md?raw')
  ) && passed;
passed =
  check('page uses parser', pageSrc.includes('parseChangelog')) && passed;
passed =
  check('page has version toc', pageSrc.includes('changelog-toc')) && passed;

const releases = parseChangelog(text);
const unreleased = releases.find((item) => item.id === 'unreleased');
const v105 = releases.find((item) => item.id === '1.0.5');
passed = check('parse one release', releases.length === 1) && passed;
passed = check('skip unreleased', unreleased === undefined) && passed;
passed =
  check(
    '1.0.5 date and kinds',
    v105?.date === '2026-09-08' &&
      v105.items.some((item) => item.kind === 'changed') &&
      v105.items.some((item) => item.kind === 'added')
  ) && passed;
passed =
  check(
    'inline code split',
    splitInlineCode('对齐 `v1.0.4` 入口')[1]?.value === 'v1.0.4'
  ) && passed;

passed =
  check(
    'parser skips Unreleased heading',
    parseChangelog(
      '## [Unreleased]\n\n暂无\n\n## [1.0.5] - 2026-09-08\n\n### Added\n\n- x\n'
    ).every((item) => item.id !== 'unreleased')
  ) && passed;

process.exit(passed ? 0 : 1);
