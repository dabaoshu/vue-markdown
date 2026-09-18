# remark-http-resource Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `@nnnb/markdown` 增加引擎层插件 `remarkHttpResource`：对 `http(s)://` 绝对地址分类并打标，不实现业务 UI。

**Architecture:** 纯函数 `classifyHttpUrl` 负责规则；`remarkHttpResource` 只访树（可选把裸 URL 提升为 `link`）并把结果写入 `node.data.httpResource` 与 `data.hProperties`。分类表和自定义回调都在 core，插件不复制规则。

**Tech Stack:** TypeScript、unified/remark、`unist-util-visit`（已有依赖）、docs 侧 `esno` AST CLI + Vue 测试页、simple Demo Tab。

## Global Constraints

- 引擎层不得依赖 Vue 运行时；默认入口不导出 UI。
- 只认 `http://` / `https://` 绝对地址；相对路径、`//cdn`、`mailto:`、`www.` 不打标。
- 不改变 `link` / `image` 的 `type`（`[封面](a.png)` 仍是 `link`）。
- 不发网络请求、不按 Content-Type 嗅探、不把图片 link 改成 `img` 节点。
- 注释使用 JSDoc；`packages/components` 分层为 `core/` + `engine/`。
- 不新增 npm 依赖（使用已有 `unist-util-visit`）。
- 分类算法与标记字段名必须与 `docs/superpowers/specs/2026-09-17-remark-http-resource-design.md` 一致。

---

## File Structure

**Create — engine**

- `packages/components/remark-http-resource/core/types.ts` — 类型
- `packages/components/remark-http-resource/core/extensions.ts` — 默认表 + 合并查找表
- `packages/components/remark-http-resource/core/classifyHttpUrl.ts` — 纯函数分类
- `packages/components/remark-http-resource/engine/promoteBareUrls.ts` — 裸 URL 提升
- `packages/components/remark-http-resource/engine/remarkHttpResource.ts` — 插件入口
- `packages/components/remark-http-resource/index.ts` — 引擎导出
- `packages/components/remark-http-resource/readme.md` — 用法

**Create — docs AST+UI**

- `packages/docs/src/test/remark-http-resource/types.ts`
- `packages/docs/src/test/remark-http-resource/classifyCases.ts`
- `packages/docs/src/test/remark-http-resource/cases.ts`
- `packages/docs/src/test/remark-http-resource/helpers.ts`
- `packages/docs/src/test/remark-http-resource/uiAssert.ts`
- `packages/docs/src/test/remark-http-resource/RemarkHttpResourcePreview.tsx`
- `packages/docs/src/test/remark-http-resource/run.ts`
- `packages/docs/src/test/remark-http-resource/cli.ts`
- `packages/docs/src/test/remark-http-resource/index.ts`
- `packages/docs/src/pages/RemarkHttpResourceTest.vue`

**Modify**

- `packages/components/markdown/index.tsx` — `export * from '../remark-http-resource'`
- `packages/docs/package.json` — `test:remark-http-resource`
- `packages/docs/src/test/index.ts` — 导出套件
- `packages/docs/src/test/readme.md` — 表格加一行
- `packages/docs/src/router/index.ts` — `/test/remark-http-resource`
- `packages/docs/src/App.vue` — 顶栏入口 + wide 路由名
- `packages/simple/src/mdeditor/demoData.ts` — Demo Tab
- `packages/simple/src/components/markdown/index.tsx` — 接入插件（`promoteBareUrls: true`）

---

### Task 1: classifyHttpUrl 纯函数

**Files:**
- Create: `packages/docs/src/test/remark-http-resource/classifyCases.ts`
- Create: `packages/docs/src/test/remark-http-resource/runClassify.ts`
- Create: `packages/docs/src/test/remark-http-resource/cli.ts`
- Create: `packages/components/remark-http-resource/core/types.ts`
- Create: `packages/components/remark-http-resource/core/extensions.ts`
- Create: `packages/components/remark-http-resource/core/classifyHttpUrl.ts`
- Create: `packages/components/remark-http-resource/index.ts`
- Modify: `packages/docs/package.json`（scripts 增加 `"test:remark-http-resource": "esno src/test/remark-http-resource/cli.ts"`）

**Interfaces:**
- Consumes: 无
- Produces:
  - `BuiltinHttpResourceKind`
  - `HttpResourceKind`
  - `HttpResource`
  - `ClassifyContext`
  - `ClassifyResult`
  - `HttpResourceOptions`
  - `DEFAULT_HTTP_RESOURCE_EXTENSIONS`
  - `buildExtensionLookup(overlay?: HttpResourceOptions['extensions']): Map<string, BuiltinHttpResourceKind>`
  - `classifyHttpUrl(url: string, options?: HttpResourceOptions): HttpResource | null`

- [ ] **Step 1: 写会失败的分类用例与 CLI**

`packages/docs/src/test/remark-http-resource/classifyCases.ts`：

```ts
import type { HttpResource, HttpResourceOptions } from '../../../../components/remark-http-resource';

/**
 * classifyHttpUrl 数据驱动用例。
 */
export interface ClassifyHttpUrlCase {
  id: string;
  title: string;
  description: string;
  url: unknown;
  options?: HttpResourceOptions;
  expect: HttpResource | null;
  /** 为 true 时断言过程中至少调用一次 console.warn */
  expectWarn?: boolean;
}

export const CLASSIFY_HTTP_URL_CASES: ClassifyHttpUrlCase[] = [
  {
    id: 'image-query-hash-case',
    title: '图片：大写扩展名 + query + hash',
    description: '只看 pathname 最后一个后缀，忽略大小写、query、hash。',
    url: 'https://cdn.example.com/a.PNG?w=100#x',
    expect: {
      kind: 'image',
      ext: 'png',
      url: 'https://cdn.example.com/a.PNG?w=100#x'
    }
  },
  {
    id: 'document-pdf',
    title: '文档：pdf',
    description: 'pdf 归 document。',
    url: 'https://x.com/report.pdf',
    expect: { kind: 'document', ext: 'pdf', url: 'https://x.com/report.pdf' }
  },
  {
    id: 'last-ext-only-txt',
    title: '只认最后一个后缀',
    description: 'file.jpg.txt 的 txt 无默认匹配，kind 为 webpage。',
    url: 'https://x.com/file.jpg.txt',
    expect: { kind: 'webpage', ext: 'txt', url: 'https://x.com/file.jpg.txt' }
  },
  {
    id: 'tar-gz-last-suffix',
    title: 'tar.gz 只认 gz',
    description: '不把 tar.gz 当复合扩展名。',
    url: 'https://x.com/pkg.tar.gz',
    expect: { kind: 'archive', ext: 'gz', url: 'https://x.com/pkg.tar.gz' }
  },
  {
    id: 'webpage-no-ext',
    title: '无后缀为 webpage',
    description: 'pathname 无点时 ext 为 null。',
    url: 'https://x.com/page',
    expect: { kind: 'webpage', ext: null, url: 'https://x.com/page' }
  },
  {
    id: 'webpage-html',
    title: 'html 为 webpage',
    description: 'htm/html 显式归 webpage。',
    url: 'http://x.com/index.HTML',
    expect: { kind: 'webpage', ext: 'html', url: 'http://x.com/index.HTML' }
  },
  {
    id: 'reject-mailto',
    title: '非 http(s) 返回 null',
    description: 'mailto 不分类。',
    url: 'mailto:a@b.com',
    expect: null
  },
  {
    id: 'reject-relative',
    title: '相对路径返回 null',
    description: '无协议不分类。',
    url: '/img/a.png',
    expect: null
  },
  {
    id: 'reject-protocol-relative',
    title: '协议相对返回 null',
    description: '//cdn 不分类。',
    url: '//cdn.example.com/a.png',
    expect: null
  },
  {
    id: 'reject-empty-host',
    title: '空 host 返回 null',
    description: 'https:// 非法或空 host。',
    url: 'https://',
    expect: null
  },
  {
    id: 'reject-blank',
    title: '空字符串返回 null',
    description: 'trim 后为空。',
    url: '   ',
    expect: null
  },
  {
    id: 'custom-kind-string',
    title: '回调返回自定义 kind',
    description: '字符串 kind 覆盖默认表，ext 仍来自 pathname。',
    url: 'https://cdn.example.com/a.png',
    options: { classify: () => 'cdn-image' },
    expect: {
      kind: 'cdn-image',
      ext: 'png',
      url: 'https://cdn.example.com/a.png'
    }
  },
  {
    id: 'custom-object-ext',
    title: '回调对象可改 ext',
    description: '显式 ext:null 必须保留。',
    url: 'https://cdn.example.com/a.png',
    options: { classify: () => ({ kind: 'cdn-image', ext: null }) },
    expect: {
      kind: 'cdn-image',
      ext: null,
      url: 'https://cdn.example.com/a.png'
    }
  },
  {
    id: 'custom-fallthrough',
    title: '回调返回 undefined 走默认表',
    description: '未命中回调则 png 仍是 image。',
    url: 'https://x.com/a.png',
    options: { classify: () => undefined },
    expect: { kind: 'image', ext: 'png', url: 'https://x.com/a.png' }
  },
  {
    id: 'custom-throw-fallback',
    title: '回调抛错回落默认表',
    description: 'warn 后 png 仍按 image。',
    url: 'https://x.com/a.png',
    options: {
      classify: () => {
        throw new Error('boom');
      }
    },
    expect: { kind: 'image', ext: 'png', url: 'https://x.com/a.png' },
    expectWarn: true
  },
  {
    id: 'overlay-heic',
    title: '用户扩展名 overlay',
    description: 'heic 追加到 image。',
    url: 'https://x.com/a.heic',
    options: { extensions: { image: ['heic'] } },
    expect: { kind: 'image', ext: 'heic', url: 'https://x.com/a.heic' }
  },
  {
    id: 'overlay-override-png',
    title: '用户表覆盖默认 kind',
    description: '把 png 改映射到 document。',
    url: 'https://x.com/a.png',
    options: { extensions: { document: ['png'] } },
    expect: { kind: 'document', ext: 'png', url: 'https://x.com/a.png' }
  },
  {
    id: 'overlay-user-conflict',
    title: '用户表内部冲突保留 image',
    description: '同一后缀出现在 image 与 document 时按 kind 顺序保留先声明者。',
    url: 'https://x.com/a.foo',
    options: { extensions: { image: ['foo'], document: ['foo'] } },
    expect: { kind: 'image', ext: 'foo', url: 'https://x.com/a.foo' },
    expectWarn: true
  }
];
```

`packages/docs/src/test/remark-http-resource/runClassify.ts`：

```ts
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
```

`packages/docs/src/test/remark-http-resource/cli.ts`：

```ts
import { runClassifyHttpUrlSuite } from './runClassify';

const ok = runClassifyHttpUrlSuite();
process.exit(ok ? 0 : 1);
```

在 `packages/docs/package.json` 的 `scripts` 中加入：

```json
"test:remark-http-resource": "esno src/test/remark-http-resource/cli.ts"
```

- [ ] **Step 2: 跑 CLI，确认失败**

Run: `pnpm --filter @nnnb/docs test:remark-http-resource`

Expected: FAIL，找不到 `../../../../components/remark-http-resource` 或 `classifyHttpUrl is not a function`。

- [ ] **Step 3: 实现 core**

`packages/components/remark-http-resource/core/types.ts`：

```ts
/** 内置资源类型 */
export type BuiltinHttpResourceKind =
  | 'image'
  | 'document'
  | 'archive'
  | 'audio'
  | 'video'
  | 'webpage';

/** 内置 kind，或自定义回调返回的非空字符串 */
export type HttpResourceKind = BuiltinHttpResourceKind | (string & {});

/** 打在 link / image 上的分类结果 */
export type HttpResource = {
  kind: HttpResourceKind;
  /** 小写、无点；pathname 无后缀时为 null */
  ext: string | null;
  /** 用于分类的 URL（trim 后） */
  url: string;
};

/** 交给自定义回调的解析上下文 */
export type ClassifyContext = {
  protocol: 'http:' | 'https:';
  pathname: string;
  ext: string | null;
  url: string;
};

/** 自定义回调返回值 */
export type ClassifyResult =
  | HttpResourceKind
  | (Pick<HttpResource, 'kind'> & { ext?: string | null })
  | null
  | undefined;

/** remarkHttpResource / classifyHttpUrl 共用选项 */
export type HttpResourceOptions = {
  /**
   * 优先于扩展名表。
   * 返回 kind 或对象即采用；返回 null/undefined/空字符串则继续走表。
   *
   * @param url 当前 URL。
   * @param ctx 已解析的协议、pathname、ext。
   */
  classify?: (url: string, ctx: ClassifyContext) => ClassifyResult;
  /**
   * 追加或覆盖默认扩展名（无点或带点均可，内部归一成小写无点）。
   */
  extensions?: Partial<Record<BuiltinHttpResourceKind, string[]>>;
  /**
   * 默认 false。为 true 时把普通 text 中的 http(s) 绝对地址提升为 link 再打标。
   */
  promoteBareUrls?: boolean;
};
```

`packages/components/remark-http-resource/core/extensions.ts`：

```ts
import type { BuiltinHttpResourceKind, HttpResourceOptions } from './types';

/** 用户表冲突时的扫描顺序：先声明者优先 */
export const BUILTIN_KIND_ORDER: readonly BuiltinHttpResourceKind[] = [
  'image',
  'document',
  'archive',
  'audio',
  'video',
  'webpage'
] as const;

/** 默认扩展名表（无点、小写） */
export const DEFAULT_HTTP_RESOURCE_EXTENSIONS: Record<
  BuiltinHttpResourceKind,
  readonly string[]
> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
  video: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'],
  webpage: ['html', 'htm']
};

/**
 * 把用户传入的扩展名归一成小写无点。
 *
 * @param raw 原始扩展名。
 * @returns 归一结果；无法使用时返回 null。
 */
export function normalizeExtToken(raw: string): string | null {
  const token = raw.trim().replace(/^\./, '').toLowerCase();
  if (!token || token.includes('/') || token.includes('.')) {
    return null;
  }
  return token;
}

/**
 * 合并默认表与用户 overlay，得到 suffix → kind 查找表。
 *
 * @param overlay 用户扩展名。
 * @returns 查找表。
 */
export function buildExtensionLookup(
  overlay?: HttpResourceOptions['extensions']
): Map<string, BuiltinHttpResourceKind> {
  const map = new Map<string, BuiltinHttpResourceKind>();

  for (const kind of BUILTIN_KIND_ORDER) {
    for (const ext of DEFAULT_HTTP_RESOURCE_EXTENSIONS[kind]) {
      map.set(ext, kind);
    }
  }

  const seenUser = new Map<string, BuiltinHttpResourceKind>();
  for (const kind of BUILTIN_KIND_ORDER) {
    for (const raw of overlay?.[kind] ?? []) {
      const ext = normalizeExtToken(raw);
      if (!ext) continue;
      const existing = seenUser.get(ext);
      if (existing && existing !== kind) {
        console.warn(
          `[remark-http-resource] extension ".${ext}" is mapped to both "${existing}" and "${kind}"; keeping "${existing}"`
        );
        continue;
      }
      seenUser.set(ext, kind);
      map.set(ext, kind);
    }
  }

  return map;
}
```

`packages/components/remark-http-resource/core/classifyHttpUrl.ts`：

```ts
import { buildExtensionLookup } from './extensions';
import type {
  ClassifyContext,
  ClassifyResult,
  HttpResource,
  HttpResourceOptions
} from './types';

/**
 * 从 pathname 取最后一段的最后一个后缀。
 *
 * @param pathname URL pathname。
 * @returns 小写无点后缀；无后缀或以点结尾时为 null。
 */
export function extFromPathname(pathname: string): string | null {
  const last = pathname.endsWith('/')
    ? pathname.slice(0, -1).split('/').pop() ?? ''
    : pathname.split('/').pop() ?? '';
  const dot = last.lastIndexOf('.');
  if (dot <= 0 || dot === last.length - 1) return null;
  return last.slice(dot + 1).toLowerCase();
}

/**
 * 把自定义回调结果收成 HttpResource；未命中返回 null。
 *
 * @param result 回调返回值。
 * @param ctx 上下文。
 */
function fromClassifyResult(
  result: ClassifyResult,
  ctx: ClassifyContext
): HttpResource | null {
  if (result == null) return null;
  if (typeof result === 'string') {
    if (result.trim() === '') return null;
    return { kind: result, ext: ctx.ext, url: ctx.url };
  }
  if (typeof result === 'object' && typeof result.kind === 'string') {
    if (result.kind.trim() === '') return null;
    const ext = 'ext' in result ? (result.ext ?? null) : ctx.ext;
    return { kind: result.kind, ext, url: ctx.url };
  }
  return null;
}

/**
 * 对单个 URL 做 http(s) 资源分类。
 *
 * @param url 原始字符串。
 * @param options 自定义回调与扩展名 overlay。
 * @returns 分类结果；非 http(s) 绝对地址时为 null。
 */
export function classifyHttpUrl(
  url: string,
  options: HttpResourceOptions = {}
): HttpResource | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }
  if (!parsed.hostname) return null;

  const ext = extFromPathname(parsed.pathname);
  const ctx: ClassifyContext = {
    protocol: parsed.protocol,
    pathname: parsed.pathname,
    ext,
    url: trimmed
  };

  if (options.classify) {
    try {
      const custom = fromClassifyResult(options.classify(trimmed, ctx), ctx);
      if (custom) return custom;
    } catch (error) {
      console.warn('[remark-http-resource] classify() threw; falling back to extension table', error);
    }
  }

  if (ext) {
    const kind = buildExtensionLookup(options.extensions).get(ext);
    if (kind) {
      return { kind, ext, url: trimmed };
    }
  }

  return { kind: 'webpage', ext, url: trimmed };
}
```

`packages/components/remark-http-resource/index.ts`：

```ts
export type {
  BuiltinHttpResourceKind,
  ClassifyContext,
  ClassifyResult,
  HttpResource,
  HttpResourceKind,
  HttpResourceOptions
} from './core/types';
export {
  BUILTIN_KIND_ORDER,
  DEFAULT_HTTP_RESOURCE_EXTENSIONS,
  buildExtensionLookup,
  normalizeExtToken
} from './core/extensions';
export { classifyHttpUrl, extFromPathname } from './core/classifyHttpUrl';
```

- [ ] **Step 4: 再跑 CLI，确认通过**

Run: `pnpm --filter @nnnb/docs test:remark-http-resource`

Expected: `classifyHttpUrl: 17/17 passed`，exit 0。

- [ ] **Step 5: Commit**

```bash
git add packages/components/remark-http-resource packages/docs/src/test/remark-http-resource packages/docs/package.json
git commit -m "feat(remark-http-resource): add classifyHttpUrl and default extension table"
```

---

### Task 2: remark 插件给 link / image 打标

**Files:**
- Create: `packages/components/remark-http-resource/engine/remarkHttpResource.ts`
- Modify: `packages/components/remark-http-resource/index.ts`
- Create: `packages/docs/src/test/remark-http-resource/types.ts`
- Create: `packages/docs/src/test/remark-http-resource/cases.ts`
- Create: `packages/docs/src/test/remark-http-resource/helpers.ts`
- Modify: `packages/docs/src/test/remark-http-resource/cli.ts`

**Interfaces:**
- Consumes: `classifyHttpUrl`, `HttpResourceOptions`
- Produces: `remarkHttpResource(options?: HttpResourceOptions): (tree) => void`；节点写入 `data.httpResource` 与 `data.hProperties['data-http-kind']` / `data-http-ext`

- [ ] **Step 1: 写会失败的 AST 用例**

`packages/docs/src/test/remark-http-resource/types.ts`：

```ts
import type { AstUiExpectation } from '../_shared/astUiTypes';
import type { HttpResource, HttpResourceOptions } from '../../../../components/remark-http-resource';

export type RemarkHttpResourceCaseGroup =
  | 'link'
  | 'image'
  | 'promote'
  | 'edge';

export interface HttpResourceNodeExpect {
  type: 'link' | 'image';
  kind: string;
  ext: string | null;
  urlIncludes?: string;
}

export interface RemarkHttpResourceExpectation {
  noThrow?: boolean;
  linkCount?: number;
  imageCount?: number;
  resources?: HttpResourceNodeExpect[];
  unannotatedLinkCount?: number;
  contentIncludes?: string[];
  ui?: AstUiExpectation;
}

export interface RemarkHttpResourceTestCase {
  id: string;
  title: string;
  group: RemarkHttpResourceCaseGroup;
  description: string;
  markdown: string;
  gfm?: boolean;
  plugin?: boolean;
  options?: HttpResourceOptions;
  expect: RemarkHttpResourceExpectation;
}
```

`packages/docs/src/test/remark-http-resource/cases.ts` 先放打标相关（promote 用例在 Task 3 再加）：

```ts
import type { RemarkHttpResourceTestCase } from './types';

export const REMARK_HTTP_RESOURCE_CASES: RemarkHttpResourceTestCase[] = [
  {
    id: 'link-image-ext',
    title: 'Markdown 链接：图片扩展名',
    group: 'link',
    description: '仍是 link，kind 为 image；带 query。',
    markdown: '[pic](https://cdn.example.com/a.PNG?w=100)',
    expect: {
      linkCount: 1,
      imageCount: 0,
      resources: [
        {
          type: 'link',
          kind: 'image',
          ext: 'png',
          urlIncludes: 'a.PNG?w=100'
        }
      ],
      contentIncludes: ['pic']
    }
  },
  {
    id: 'image-syntax',
    title: '图片语法同样打标',
    group: 'image',
    description: 'type 仍是 image。',
    markdown: '![alt](https://x.com/photo.webp)',
    expect: {
      imageCount: 1,
      resources: [{ type: 'image', kind: 'image', ext: 'webp' }]
    }
  },
  {
    id: 'link-pdf',
    title: '文档链接',
    group: 'link',
    description: 'pdf → document。',
    markdown: '[报告](https://x.com/report.pdf)',
    expect: {
      resources: [{ type: 'link', kind: 'document', ext: 'pdf' }]
    }
  },
  {
    id: 'link-webpage',
    title: '无扩展名网页',
    group: 'link',
    description: 'ext 为 null，不写 data-http-ext。',
    markdown: '[页](https://x.com/page)',
    expect: {
      resources: [{ type: 'link', kind: 'webpage', ext: null }]
    }
  },
  {
    id: 'edge-relative',
    title: '相对路径不打标',
    group: 'edge',
    description: '/img/a.png 保持普通 link。',
    markdown: '[rel](/img/a.png)',
    expect: {
      linkCount: 1,
      resources: [],
      unannotatedLinkCount: 1
    }
  },
  {
    id: 'edge-mailto',
    title: 'mailto 不打标',
    group: 'edge',
    description: '非 http(s)。',
    markdown: '[mail](mailto:a@b.com)',
    expect: {
      linkCount: 1,
      resources: [],
      unannotatedLinkCount: 1
    }
  },
  {
    id: 'edge-inline-code',
    title: '行内代码中的 URL 不提升也不打标',
    group: 'edge',
    description: 'inlineCode 保持文本。',
    markdown: '见 `https://x.com/a.png`',
    expect: {
      linkCount: 0,
      resources: [],
      contentIncludes: ['https://x.com/a.png']
    }
  },
  {
    id: 'promote-off-bare',
    title: '默认不提升裸 URL',
    group: 'promote',
    description: '关闭 gfm 且 promoteBareUrls 默认 false 时仍是文本。',
    markdown: '见 https://x.com/a.png',
    gfm: false,
    expect: {
      linkCount: 0,
      resources: [],
      contentIncludes: ['https://x.com/a.png']
    }
  }
];
```

`packages/docs/src/test/remark-http-resource/helpers.ts`：

```ts
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
```

把 `cli.ts` 改成先跑 classify、再跑 AST：

```ts
import { runClassifyHttpUrlSuite } from './runClassify';
import { REMARK_HTTP_RESOURCE_CASES } from './cases';
import { runRemarkHttpResourceCase } from './helpers';
import { runAstSuiteCli } from '../_shared/astUiHelpers';

const classifyOk = runClassifyHttpUrlSuite();
const astOk = runAstSuiteCli(
  'remark-http-resource',
  REMARK_HTTP_RESOURCE_CASES,
  runRemarkHttpResourceCase
);
process.exit(classifyOk && astOk ? 0 : 1);
```

- [ ] **Step 2: 跑 CLI，确认 AST 失败**

Run: `pnpm --filter @nnnb/docs test:remark-http-resource`

Expected: classify 仍通过；AST 失败（`remarkHttpResource` 未导出或节点无 `httpResource`）。

- [ ] **Step 3: 实现打标插件**

`packages/components/remark-http-resource/engine/remarkHttpResource.ts`：

```ts
import { visit } from 'unist-util-visit';
import { classifyHttpUrl } from '../core/classifyHttpUrl';
import type { HttpResource, HttpResourceOptions } from '../core/types';

/** 可打标的 mdast 节点 */
interface UrlNode {
  type: string;
  url?: string;
  data?: {
    httpResource?: HttpResource;
    hProperties?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

/**
 * 把分类结果写进节点 data（合并、不删其它键）。
 *
 * @param node link 或 image。
 * @param options 插件选项。
 */
export function annotateHttpResourceNode(
  node: UrlNode,
  options: HttpResourceOptions
): void {
  const url = typeof node.url === 'string' ? node.url : '';
  if (!url) return;
  const resource = classifyHttpUrl(url, options);
  if (!resource) return;

  const prev = node.data ?? {};
  const prevProps =
    prev.hProperties && typeof prev.hProperties === 'object'
      ? { ...prev.hProperties }
      : {};
  const hProperties: Record<string, unknown> = {
    ...prevProps,
    'data-http-kind': resource.kind
  };
  if (resource.ext == null) {
    delete hProperties['data-http-ext'];
  } else {
    hProperties['data-http-ext'] = resource.ext;
  }

  node.data = {
    ...prev,
    httpResource: resource,
    hProperties
  };
}

/**
 * remark 插件：给 http(s) 的 link / image 打资源分类标记。
 *
 * @param options 分类与可选裸 URL 提升。
 */
export function remarkHttpResource(options: HttpResourceOptions = {}) {
  return (tree: unknown) => {
    visit(tree as { type: string }, (node: UrlNode) => {
      if (node.type === 'link' || node.type === 'image') {
        annotateHttpResourceNode(node, options);
      }
    });
  };
}
```

`index.ts` 增加：

```ts
export { remarkHttpResource, annotateHttpResourceNode } from './engine/remarkHttpResource';
```

Task 3 再把 `promoteBareUrls` 接到这个 transformer 最前面。

- [ ] **Step 4: 再跑 CLI**

Run: `pnpm --filter @nnnb/docs test:remark-http-resource`

Expected: classify + 当前 AST 用例全绿。

- [ ] **Step 5: Commit**

```bash
git add packages/components/remark-http-resource packages/docs/src/test/remark-http-resource
git commit -m "feat(remark-http-resource): annotate link and image nodes"
```

---

### Task 3: promoteBareUrls

**Files:**
- Create: `packages/components/remark-http-resource/engine/promoteBareUrls.ts`
- Modify: `packages/components/remark-http-resource/engine/remarkHttpResource.ts`
- Modify: `packages/docs/src/test/remark-http-resource/cases.ts`

**Interfaces:**
- Consumes: `annotateHttpResourceNode`（提升之后由插件统一打标）
- Produces: `promoteBareHttpUrls(tree: unknown): void`

- [ ] **Step 1: 追加会失败的用例**

在 `REMARK_HTTP_RESOURCE_CASES` 末尾追加：

```ts
  {
    id: 'promote-on-bare',
    title: '开启后提升裸 URL',
    group: 'promote',
    description: 'text 中的 https 图片地址变成 link 且 kind=image。',
    markdown: '见 https://x.com/a.png 结尾。',
    gfm: false,
    options: { promoteBareUrls: true },
    expect: {
      linkCount: 1,
      resources: [{ type: 'link', kind: 'image', ext: 'png', urlIncludes: 'https://x.com/a.png' }],
      contentIncludes: ['见', '结尾']
    }
  },
  {
    id: 'promote-strip-punct',
    title: '提升时剥掉末尾标点',
    group: 'promote',
    description: '句号不进入 url。',
    markdown: '打开 https://x.com/a.png。',
    gfm: false,
    options: { promoteBareUrls: true },
    expect: {
      resources: [{ type: 'link', kind: 'image', ext: 'png', urlIncludes: 'https://x.com/a.png' }],
      contentIncludes: ['。']
    }
  },
  {
    id: 'promote-skip-existing-link',
    title: '已是链接的不再拆一次',
    group: 'promote',
    description: 'markdown 链接内部 text 不二次提升。',
    markdown: '[封面](https://x.com/a.png)',
    gfm: false,
    options: { promoteBareUrls: true },
    expect: {
      linkCount: 1,
      resources: [{ type: 'link', kind: 'image', ext: 'png' }]
    }
  }
```

- [ ] **Step 2: 跑 CLI，确认新用例失败**

Run: `pnpm --filter @nnnb/docs test:remark-http-resource`

Expected: `promote-on-bare` 等 linkCount 为 0。

- [ ] **Step 3: 实现提升并接入插件**

`packages/components/remark-http-resource/engine/promoteBareUrls.ts`：

```ts
import { SKIP, visit } from 'unist-util-visit';

const BARE_URL = /https?:\/\/[^\s<>"'()]+/gi;
const TRAILING_PUNCT = /[.,;:!?。，；：！？]+$/;
const SKIP_PARENT = new Set(['link', 'image', 'code', 'inlineCode', 'definition']);

interface TextNode {
  type: 'text';
  value: string;
}

interface LinkNode {
  type: 'link';
  url: string;
  title: null;
  children: TextNode[];
}

interface ParentNode {
  type: string;
  children: Array<TextNode | LinkNode | { type: string }>;
}

/**
 * 把一段文本拆成 text / link 节点。
 *
 * @param value 原始文本。
 */
export function splitTextWithBareHttpUrls(
  value: string
): Array<TextNode | LinkNode> {
  const nodes: Array<TextNode | LinkNode> = [];
  let lastIndex = 0;
  BARE_URL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BARE_URL.exec(value))) {
    const raw = match[0];
    const url = raw.replace(TRAILING_PUNCT, '');
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    }
    if (url) {
      nodes.push({
        type: 'link',
        url,
        title: null,
        children: [{ type: 'text', value: url }]
      });
    }
    lastIndex = match.index + url.length;
    BARE_URL.lastIndex = lastIndex;
  }
  if (lastIndex < value.length) {
    nodes.push({ type: 'text', value: value.slice(lastIndex) });
  }
  return nodes.length ? nodes : [{ type: 'text', value }];
}

/**
 * 将树中普通 text 的 http(s) 绝对地址提升为 link。
 *
 * @param tree mdast 根。
 */
export function promoteBareHttpUrls(tree: unknown): void {
  visit(
    tree as { type: string },
    'text',
    (node: TextNode, index, parent: ParentNode | undefined) => {
      if (parent == null || index == null) return;
      if (SKIP_PARENT.has(parent.type)) return;
      if (!node.value || !/https?:\/\//i.test(node.value)) return;
      const next = splitTextWithBareHttpUrls(node.value);
      if (next.length === 1 && next[0].type === 'text') return;
      parent.children.splice(index, 1, ...next);
      return [SKIP, index + next.length] as const;
    }
  );
}
```

`remarkHttpResource.ts` 的 transformer 改为：

```ts
import { promoteBareHttpUrls } from './promoteBareUrls';

export function remarkHttpResource(options: HttpResourceOptions = {}) {
  return (tree: unknown) => {
    if (options.promoteBareUrls) {
      promoteBareHttpUrls(tree);
    }
    visit(tree as { type: string }, (node: UrlNode) => {
      if (node.type === 'link' || node.type === 'image') {
        annotateHttpResourceNode(node, options);
      }
    });
  };
}
```

`index.ts` 增加导出 `promoteBareHttpUrls`、`splitTextWithBareHttpUrls`（可选；至少插件入口已接上即可）。

- [ ] **Step 4: 再跑 CLI**

Run: `pnpm --filter @nnnb/docs test:remark-http-resource`

Expected: 全绿。

- [ ] **Step 5: Commit**

```bash
git add packages/components/remark-http-resource packages/docs/src/test/remark-http-resource/cases.ts
git commit -m "feat(remark-http-resource): optionally promote bare http(s) URLs"
```

---

### Task 4: 包导出与 readme

**Files:**
- Modify: `packages/components/markdown/index.tsx`
- Create: `packages/components/remark-http-resource/readme.md`

**Interfaces:**
- Consumes: Task 1–3 的公开符号
- Produces: `import { remarkHttpResource, classifyHttpUrl, DEFAULT_HTTP_RESOURCE_EXTENSIONS } from '@nnnb/markdown'`

- [ ] **Step 1: 再导出**

`packages/components/markdown/index.tsx` 现为：

```ts
export * from '../remark-think';
export * from './markdown';
export * from '../componentsUtils';
```

改为：

```ts
export * from '../remark-think';
export * from '../remark-http-resource';
export * from './markdown';
export * from '../componentsUtils';
```

不要从 `vue-ui.ts` 导出本插件。

- [ ] **Step 2: 写 readme.md**

内容必须包含：分层说明、默认入口只导出引擎、管线需放在 `remark-gfm` 之后、选项表、标记字段 `data.httpResource` / `data-http-kind`、以及下面示例：

```ts
import { remarkHttpResource } from '@nnnb/markdown';

const plugins = [
  [remarkHttpResource, {
    promoteBareUrls: false,
    extensions: { image: ['heic'] },
    classify: (url, ctx) => {
      if (url.includes('cdn.example.com') && ctx.ext === 'png') {
        return 'cdn-image';
      }
      return undefined;
    }
  }]
];
```

- [ ] **Step 3: 用包名跑一次 CLI（helpers 仍可用相对路径）**

Run: `pnpm --filter @nnnb/docs test:remark-http-resource`

Expected: 仍全绿。

- [ ] **Step 4: Commit**

```bash
git add packages/components/markdown/index.tsx packages/components/remark-http-resource/readme.md
git commit -m "feat(remark-http-resource): export from @nnnb/markdown"
```

---

### Task 5: docs AST + UI 测试页

**Files:**
- Create: `packages/docs/src/test/remark-http-resource/uiAssert.ts`
- Create: `packages/docs/src/test/remark-http-resource/RemarkHttpResourcePreview.tsx`
- Create: `packages/docs/src/test/remark-http-resource/run.ts`
- Create: `packages/docs/src/test/remark-http-resource/index.ts`
- Create: `packages/docs/src/pages/RemarkHttpResourceTest.vue`
- Modify: `packages/docs/src/test/index.ts`
- Modify: `packages/docs/src/test/readme.md`
- Modify: `packages/docs/src/router/index.ts`
- Modify: `packages/docs/src/App.vue`

**Interfaces:**
- Consumes: `REMARK_HTTP_RESOURCE_CASES`、`evaluateRemarkHttpResourceCase`、`remarkHttpResource`
- Produces: 路由 `/test/remark-http-resource`；CLI 仍只跑 AST；页面批跑 DOM 校验 `[data-http-kind]`

- [ ] **Step 1: UI 断言与按用例接线的 Preview**

`uiAssert.ts`：

```ts
import type { AstUiExpectation } from '../_shared/astUiTypes';
import { assertAstUi } from '../_shared/astUiHelpers';
import type { RemarkHttpResourceTestCase } from './types';

export const UI_SELECTORS = {
  kind: '[data-http-kind]',
  imageKind: '[data-http-kind="image"]',
  documentKind: '[data-http-kind="document"]',
  webpageKind: '[data-http-kind="webpage"]'
} as const;

/**
 * 按 AST expect.resources 推导默认 UI。
 *
 * @param testCase 用例。
 */
export function buildDefaultUiExpectation(
  testCase: RemarkHttpResourceTestCase
): AstUiExpectation {
  const resources = testCase.expect.resources ?? [];
  const has: AstUiExpectation['has'] = [];
  const missing: string[] = [];
  if (resources.length > 0) {
    has.push({ selector: UI_SELECTORS.kind, min: resources.length });
  } else {
    missing.push(UI_SELECTORS.kind);
  }
  return {
    has,
    missing,
    textIncludes: [...(testCase.expect.contentIncludes ?? [])]
  };
}

/**
 * 合并显式 ui。
 *
 * @param testCase 用例。
 */
export function resolveUiExpectation(
  testCase: RemarkHttpResourceTestCase
): AstUiExpectation {
  const defaults = buildDefaultUiExpectation(testCase);
  const explicit = testCase.expect.ui;
  if (!explicit) return defaults;
  return {
    has: explicit.has ?? defaults.has,
    missing: explicit.missing ?? defaults.missing,
    textIncludes: explicit.textIncludes ?? defaults.textIncludes,
    textExcludes: explicit.textExcludes ?? defaults.textExcludes
  };
}

/**
 * 对预览根做 UI 断言。
 *
 * @param root 预览 DOM。
 * @param testCase 用例。
 */
export function assertRemarkHttpResourceUi(
  root: ParentNode,
  testCase: RemarkHttpResourceTestCase
): void {
  assertAstUi(root, testCase.id, resolveUiExpectation(testCase));
}
```

`RemarkHttpResourcePreview.tsx`：

```tsx
import { defineComponent, type PropType } from 'vue';
import RemarkGfm from 'remark-gfm';
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import {
  remarkHttpResource,
  type HttpResourceOptions
} from '@nnnb/markdown';

/**
 * 测试页专用预览：只接 gfm（可选）+ remarkHttpResource，关闭 math。
 */
export default defineComponent({
  name: 'RemarkHttpResourcePreview',
  props: {
    source: { type: String, required: true },
    gfm: { type: Boolean, default: true },
    plugin: { type: Boolean, default: true },
    options: {
      type: Object as PropType<HttpResourceOptions>,
      default: () => ({})
    }
  },
  setup(props) {
    return () => {
      const remarkPlugins: unknown[] = [];
      if (props.gfm) {
        remarkPlugins.push([RemarkGfm, { singleTilde: false }]);
      }
      if (props.plugin) {
        remarkPlugins.push([remarkHttpResource, props.options]);
      }
      return (
        <VueMarkdown
          class={'markdown'}
          source={props.source}
          remarkPlugins={remarkPlugins}
          math={null}
        />
      );
    };
  }
});
```

`run.ts`：

```ts
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
```

`cli.ts` 改为：

```ts
import { runClassifyHttpUrlSuite } from './runClassify';
import { runRemarkHttpResourceCli } from './run';

const classifyOk = runClassifyHttpUrlSuite();
const { astOk } = runRemarkHttpResourceCli();
process.exit(classifyOk && astOk ? 0 : 1);
```

`index.ts` 按 `remark-gfm/index.ts` 同样再导出 cases / helpers / uiAssert / run。

- [ ] **Step 2: 测试页 + 路由 + 顶栏**

`packages/docs/src/pages/RemarkHttpResourceTest.vue` 从 `RemarkGfmTest.vue` 复制后只改这些点（其余结构保持不动）：

- 标题改为 `remark-http-resource 测试用例`
- Demo 链接改为 `to="/demo"`（simple 侧 Tab 在 Task 6；docs Demo 无对应 tab 时不要写死不存在的 `?tab=`）
- import Preview 与套件改为 `@/test/remark-http-resource`
- `GROUP_LABELS`：

```ts
const GROUP_LABELS: Record<RemarkHttpResourceCaseGroup | 'all', string> = {
  all: '全部',
  link: '链接',
  image: '图片',
  promote: '裸 URL',
  edge: '边界'
};
```

- 选中预览与批跑预览传入：

```vue
<RemarkHttpResourcePreview
  :source="selectedCase.markdown"
  :gfm="selectedCase.gfm !== false"
  :plugin="selectedCase.plugin !== false"
  :options="selectedCase.options || {}"
/>
```

- flags 展示 `gfm` / `promoteBareUrls`
- `assertRemarkHttpResourceUi` 替换 `assertRemarkGfmUi`

`router/index.ts` 在 mermaid 测试路由后增加：

```ts
{
  path: '/test/remark-http-resource',
  name: 'RemarkHttpResourceTest',
  component: () => import('@/pages/RemarkHttpResourceTest.vue')
}
```

`App.vue` 顶栏在 Think 前增加：

```vue
<RouterLink
  to="/test/remark-http-resource"
  class="docs-nav-link"
  active-class="is-active"
>
  HTTP
</RouterLink>
```

`TEST_ROUTE_NAMES` 加入 `'RemarkHttpResourceTest'`。

`packages/docs/src/test/index.ts` 增加：

```ts
export * as remarkHttpResourceTest from './remark-http-resource';
```

`packages/docs/src/test/readme.md` 表格增加一行：

```text
| remark-http-resource | `remark-http-resource/` | `/test/remark-http-resource` | `pnpm --filter @nnnb/docs test:remark-http-resource` |
```

- [ ] **Step 3: 跑 CLI**

Run: `pnpm --filter @nnnb/docs test:remark-http-resource`

Expected: classify + AST 全绿。

- [ ] **Step 4: 浏览器打开测试页做 UI 批跑**

Run: `pnpm --filter @nnnb/docs dev`，打开 `/test/remark-http-resource`。

Expected: 侧栏每条 AST / UI 均为通过；正向用例 DOM 有 `[data-http-kind]`；负向（相对路径、mailto、行内 code、promote-off）没有该属性。`link-webpage` 有 `data-http-kind="webpage"` 且无 `data-http-ext`。

- [ ] **Step 5: Commit**

```bash
git add packages/docs
git commit -m "test(remark-http-resource): add AST+UI suite and docs page"
```

---

### Task 6: simple Demo Tab（框架接入，spec 已批准）

**Files:**
- Modify: `packages/simple/src/mdeditor/demoData.ts`
- Modify: `packages/simple/src/components/markdown/index.tsx`

**Interfaces:**
- Consumes: `remarkHttpResource`
- Produces: Demo Tab `httpResource`；预览仍用默认 `<a>` / `<img>`，DOM 上能看到 `data-http-kind`

- [ ] **Step 1: 示例 Markdown + Tab**

`DemoTabId` 增加 `'httpResource'`。

`DEMO_TAB_CONFIG` 增加：

```ts
  httpResource: {
    label: 'HTTP 资源分类',
    markdown: `# HTTP 资源分类（remarkHttpResource）

引擎只打标，不改成卡片。下面这些地址应带 \`data-http-kind\`。

图片链接（仍是 a，不是自动 img）：
[封面](https://cdn.example.com/cover.PNG?w=800)

图片语法：
![logo](https://cdn.example.com/logo.webp)

文档：
[说明书](https://example.com/manual.pdf)

无扩展名网页：
[主页](https://example.com/about)

裸 URL（simple 开启 promoteBareUrls）：
https://example.com/file.zip
`
  }
```

`DEMO_TAB_ORDER` 在 `'think'` 前插入 `'httpResource'`。

overview 表格加一行：`| HTTP 资源分类 | \`remarkHttpResource\` |`。

- [ ] **Step 2: 接到 VueMarkdown**

`packages/simple/src/components/markdown/index.tsx` 增加：

```ts
import { remarkHttpResource } from '@nnnb/markdown';
```

`remarkPlugins` 在 `RemarkGfm` **之后**加入：

```ts
[remarkHttpResource, { promoteBareUrls: true }]
```

不要在 components 包里加文件卡片 UI。

- [ ] **Step 3: 本地看一眼**

Run: `pnpm --filter @nnnb/simple dev`，打开编辑器切到「HTTP 资源分类」。

Expected: 链接可点；开发者工具里 `a`/`img` 有 `data-http-kind`；`cover.PNG?w=800` 为 `image`；`manual.pdf` 为 `document`；`file.zip` 为 `archive`；`/about` 为 `webpage`。

- [ ] **Step 4: graphify 更新**

Run: `graphify update .`

Expected: 命令成功（若环境没有 graphify，在提交说明里写明已跳过）。

- [ ] **Step 5: Commit**

```bash
git add packages/simple/src/mdeditor/demoData.ts packages/simple/src/components/markdown/index.tsx
git commit -m "feat(simple): demo tab for remarkHttpResource"
```

---

## Self-Review

**1. Spec coverage**

| Spec 项 | Task |
| --- | --- |
| `classifyHttpUrl` + 默认表 + query/hash/大小写 | Task 1 |
| 自定义回调 / overlay / 抛错回落 | Task 1 |
| 只打标不改 type | Task 2 |
| `data.httpResource` + `data-http-kind`/`data-http-ext` | Task 2 |
| 相对路径 / mailto / 代码不打标 | Task 2 |
| `promoteBareUrls` 默认关、可选开 | Task 3 |
| 从 `@nnnb/markdown` 导出、无 UI 混导 | Task 4 |
| docs AST+UI `/test/remark-http-resource` | Task 5 |
| simple Demo Tab | Task 6 |
| 不发网络、不改成 img 节点 | 全局约束 + 用例 `link-image-ext` |

**2. Placeholder scan:** 无 TBD /「类似 Task N 自行补全」。Test.vue 明确「从 RemarkGfmTest.vue 复制后只改列出的点」，避免再贴 300 行重复壳。

**3. Type consistency:** `HttpResource` / `HttpResourceOptions` / `remarkHttpResource` / `classifyHttpUrl` 在 Task 1 定义，后续任务只消费这些名字。
