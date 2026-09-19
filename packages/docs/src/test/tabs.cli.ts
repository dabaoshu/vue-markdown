import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TEST_TAB_ID, resolveTestTabId, TEST_TAB_LIST } from './testTabs';

/**
 * @param name 用例名
 * @param ok 是否通过
 */
function check(name: string, ok: boolean): boolean {
  if (!ok) console.error(`[test-tabs] FAIL ${name}`);
  else console.log(`[test-tabs] ok ${name}`);
  return ok;
}

let passed = true;
passed = check('six tabs', TEST_TAB_LIST.length === 6) && passed;
passed =
  check('default gfm', resolveTestTabId(undefined) === DEFAULT_TEST_TAB_ID) &&
  passed;
passed = check('valid math', resolveTestTabId('math') === 'math') && passed;
passed =
  check('invalid fallback', resolveTestTabId('assistant') === 'gfm') && passed;
passed =
  check(
    'legacy think path',
    TEST_TAB_LIST.find((tab) => tab.id === 'think')?.legacyPath ===
      '/test/remark-think'
  ) && passed;

const here = dirname(fileURLToPath(import.meta.url));
const docsPackageRoot = resolve(here, '../..');
const appVue = existsSync(resolve(docsPackageRoot, 'src/App.vue'))
  ? readFileSync(resolve(docsPackageRoot, 'src/App.vue'), 'utf8')
  : '';
const routerSrc = existsSync(resolve(docsPackageRoot, 'src/router/index.ts'))
  ? readFileSync(resolve(docsPackageRoot, 'src/router/index.ts'), 'utf8')
  : '';

passed =
  check(
    'nav merged test link',
    appVue.includes('to="/test"') &&
      appVue.includes('测试') &&
      appVue.includes('to="/test/remark-gfm"') === false
  ) && passed;
passed =
  check(
    'router /test page',
    routerSrc.includes("path: '/test'") && routerSrc.includes('Tests.vue')
  ) && passed;
passed =
  check(
    'legacy redirect',
    routerSrc.includes("path: '/test/remark-gfm'") &&
      routerSrc.includes("tab: 'gfm'")
  ) && passed;

process.exit(passed ? 0 : 1);
