import { unified } from 'unified';
import remarkParse from 'remark-parse';
import RemarkGfm from 'remark-gfm';
import type { AstUiCaseResult } from '../_shared/astUiTypes';
import {
  collectNodesByType,
  treeText,
  treeToDisplayJson,
  type TestTreeNode
} from '../_shared/astUiHelpers';
import { remarkHttpResource } from '../../../../components/remark-http-resource';
import type { HttpResource } from '../../../../components/remark-http-resource';
import type {
  RemarkHttpResourceExpectation,
  RemarkHttpResourceTestCase
} from './types';

export type { TestTreeNode };
export { treeToDisplayJson };

interface ResourceTestNode extends TestTreeNode {
  url?: string;
  data?: TestTreeNode['data'] & {
    httpResource?: HttpResource;
    hProperties?: Record<string, unknown>;
  };
}

/**
 * 解析 Markdown，并按用例注入 gfm 与 remarkHttpResource。
 *
 * @param markdown 输入。
 * @param testCase 用例配置。
 */
export function parseHttpResourceMarkdown(
  markdown: string,
  testCase: Pick<RemarkHttpResourceTestCase, 'gfm' | 'plugin' | 'options'>
): TestTreeNode {
  const processor = unified().use(remarkParse);
  if (testCase.gfm !== false) {
    processor.use(RemarkGfm, { singleTilde: false });
  }
  if (testCase.plugin !== false) {
    processor.use(remarkHttpResource, testCase.options ?? {});
  }
  const tree = processor.parse(markdown) as TestTreeNode;
  return processor.runSync(tree) as TestTreeNode;
}

function fail(testCase: RemarkHttpResourceTestCase, message: string): never {
  throw new Error(`[${testCase.id}] ${message}`);
}

/**
 * AST 断言。
 *
 * @param testCase 用例。
 * @param tree 解析树。
 * @param thrown 解析异常。
 */
export function assertRemarkHttpResourceCase(
  testCase: RemarkHttpResourceTestCase,
  tree: TestTreeNode | null,
  thrown?: unknown
): void {
  const expectation = testCase.expect;
  if (thrown) {
    if (expectation.noThrow !== false) {
      fail(testCase, `期望不抛错，实际 ${String(thrown)}`);
    }
    return;
  }
  if (!tree) fail(testCase, '解析结果为空');

  const root = tree as ResourceTestNode;
  const links = collectNodesByType(root, 'link') as ResourceTestNode[];
  const images = collectNodesByType(root, 'image') as ResourceTestNode[];
  const annotated = [...links, ...images].filter((node) => node.data?.httpResource);

  if (expectation.linkCount !== undefined && links.length !== expectation.linkCount) {
    fail(testCase, `linkCount 期望 ${expectation.linkCount}，实际 ${links.length}`);
  }
  if (expectation.imageCount !== undefined && images.length !== expectation.imageCount) {
    fail(testCase, `imageCount 期望 ${expectation.imageCount}，实际 ${images.length}`);
  }

  for (const snippet of expectation.contentIncludes ?? []) {
    if (!treeText(root).includes(snippet)) {
      fail(testCase, `contentIncludes 未命中 ${JSON.stringify(snippet)}`);
    }
  }

  const resources = expectation.resources ?? [];
  if (resources.length !== annotated.length && expectation.resources) {
    fail(
      testCase,
      `resources 条数期望 ${resources.length}，实际 ${annotated.length}`
    );
  }

  resources.forEach((expected, index) => {
    const node = annotated.find((item) => {
      const mark = item.data?.httpResource;
      return (
        item.type === expected.type &&
        mark?.kind === expected.kind &&
        (mark?.ext ?? null) === expected.ext &&
        (!expected.urlIncludes || (item.url ?? '').includes(expected.urlIncludes))
      );
    });
    if (!node) {
      fail(testCase, `未找到 resources[${index}] ${JSON.stringify(expected)}`);
    }
    const mark = node.data?.httpResource;
    const props = node.data?.hProperties ?? {};
    if (props['data-http-kind'] !== mark?.kind) {
      fail(testCase, 'hProperties data-http-kind 与 httpResource.kind 不一致');
    }
    if (mark?.ext == null) {
      if ('data-http-ext' in props) {
        fail(testCase, 'ext 为 null 时不应写 data-http-ext');
      }
    } else if (props['data-http-ext'] !== mark.ext) {
      fail(testCase, 'hProperties data-http-ext 不匹配');
    }
  });

  if (expectation.unannotatedLinkCount !== undefined) {
    const count = links.filter((node) => !node.data?.httpResource).length;
    if (count !== expectation.unannotatedLinkCount) {
      fail(
        testCase,
        `unannotatedLinkCount 期望 ${expectation.unannotatedLinkCount}，实际 ${count}`
      );
    }
  }
}

export type RemarkHttpResourceCaseResult = AstUiCaseResult<TestTreeNode>;

/**
 * 评估单条用例的 AST 层。
 *
 * @param testCase 用例。
 */
export function evaluateRemarkHttpResourceCase(
  testCase: RemarkHttpResourceTestCase
): RemarkHttpResourceCaseResult {
  let tree: TestTreeNode | null = null;
  let thrown: unknown;
  try {
    tree = parseHttpResourceMarkdown(testCase.markdown, testCase);
  } catch (error) {
    thrown = error;
  }
  try {
    assertRemarkHttpResourceCase(testCase, tree, thrown);
    return { ok: true, parseOk: true, uiOk: null, tree };
  } catch (error) {
    const parseError = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      parseOk: false,
      uiOk: null,
      tree,
      parseError,
      error: parseError
    };
  }
}

/**
 * CLI 运行单条（失败抛错）。
 *
 * @param testCase 用例。
 */
export function runRemarkHttpResourceCase(
  testCase: RemarkHttpResourceTestCase
): void {
  const result = evaluateRemarkHttpResourceCase(testCase);
  if (!result.ok) throw new Error(result.error);
}
