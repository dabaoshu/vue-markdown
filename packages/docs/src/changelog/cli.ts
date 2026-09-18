import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
passed = check('has Unreleased', text.includes('## [Unreleased]')) && passed;
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
    text.includes('更早版本') && text.includes('1.0.4')
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
passed = check('mermaid off', pageSrc.includes('mermaid: false')) && passed;

process.exit(passed ? 0 : 1);
