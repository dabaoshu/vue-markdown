import { classifyHttpUrl } from '../../../../components/remark-http-resource';
import {
  CLASSIFY_HTTP_URL_CASES,
  type ClassifyHttpUrlCase
} from './classifyCases';
import { runAstSuiteCli } from '../_shared/astUiHelpers';

/**
 * 断言单条 classifyHttpUrl 用例。
 *
 * @param testCase 用例。
 */
export function runClassifyHttpUrlCase(testCase: ClassifyHttpUrlCase): void {
  const warns: unknown[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warns.push(args);
  };
  try {
    const actual = classifyHttpUrl(
      testCase.url as string,
      testCase.options
    );
    const expected = testCase.expect;
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        `[${testCase.id}] 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`
      );
    }
    if (testCase.expectWarn && warns.length === 0) {
      throw new Error(`[${testCase.id}] 期望 console.warn，实际未调用`);
    }
  } finally {
    console.warn = originalWarn;
  }
}

/**
 * 运行 classifyHttpUrl 套件。
 */
export function runClassifyHttpUrlSuite(
  cases: ClassifyHttpUrlCase[] = CLASSIFY_HTTP_URL_CASES
): boolean {
  return runAstSuiteCli('classifyHttpUrl', cases, runClassifyHttpUrlCase);
}
