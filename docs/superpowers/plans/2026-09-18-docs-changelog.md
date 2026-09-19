# Docs 版本更新日志 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以仓库根目录 `CHANGELOG.md` 为唯一源，在文档站增加 `/changelog` 页和顶栏「更新日志」，记录 `@nnnb/markdown` 从 1.0.5 起的公开发布。

**Architecture:** Keep a Changelog 文本放在仓库根；docs Vite 用 `@repo` 别名 `?raw` 导入，`Changelog.vue` 用 `MarkdownRenderer` 只开 GFM/breaks。CLI 读同一文件和站点源码做断言，不另存副本、不生成脚本。

**Tech Stack:** Vue 3 SFC、Vue Router、`@nnnb/markdown-ui` 的 `MarkdownRenderer`、Vite `?raw`、docs 现有 `esno` CLI。

## Global Constraints

- 只改文档站与根目录 `CHANGELOG.md`。禁止改 `packages/simple/**`、`packages/docs/src/demo/**`、`packages/components/**`、`packages/markdown-ui` 工作台 API。
- 禁止使用 `MarkdownWorkbench`。禁止在 `packages/docs/src` 再复制一份 changelog。
- 文档站 / simple 改动（业务场景、流式对话等）不准写入 `CHANGELOG.md`。
- `[Unreleased]` 只写尚未打进下一版 `@nnnb/markdown` 的包改动；当前没有则只写「暂无尚未发布的包改动。」
- `/changelog` 不加入 `isWidePage`。不改 `Home.vue`。
- 注释使用 JSDoc。色板对齐 `.cursor/rules/docs-ui.mdc`（slate + `#2563eb`）。
- 规格原文：`docs/superpowers/specs/2026-09-18-docs-changelog-design.md`。
- Windows PowerShell 不要用 `&&` 连接命令，改用 `;`。

---

## File Structure

**Create**

- `CHANGELOG.md` — 唯一源（Keep a Changelog，中文）
- `packages/docs/src/changelog/cli.ts` — 文件与站点接线断言
- `packages/docs/src/pages/Changelog.vue` — `/changelog` 页

**Modify**

- `packages/docs/package.json` — `"test:changelog": "esno src/changelog/cli.ts"`
- `packages/docs/vite.config.ts` — `alias['@repo']`
- `packages/docs/tsconfig.json` — `paths['@repo/*']`（给 `vue-tsc` 解析 raw 导入）
- `packages/docs/src/router/index.ts` — `/changelog`
- `packages/docs/src/App.vue` — 顶栏「更新日志」

**Do not create:** `packages/docs/src/test/changelog/` 可视化页。  
**Do not modify:** `packages/docs/src/pages/Home.vue`、`isWidePage` 逻辑。

---

### Task 1: CHANGELOG.md 与内容 CLI

**Files:**
- Create: `packages/docs/src/changelog/cli.ts`
- Create: `CHANGELOG.md`
- Modify: `packages/docs/package.json`

**Interfaces:**
- Consumes: 无
- Produces:
  - 根目录 `CHANGELOG.md` 固定首版正文（见 Step 3）
  - CLI 从 `packages/docs` 解析 `../../CHANGELOG.md`
  - npm script `test:changelog`

- [ ] **Step 1: 写会失败的 CLI（只测文件内容）**

创建 `packages/docs/src/changelog/cli.ts`：

```ts
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

process.exit(passed ? 0 : 1);
```

在 `packages/docs/package.json` 的 `scripts` 中、`test:scenes` 之后增加：

```json
"test:changelog": "esno src/changelog/cli.ts"
```

- [ ] **Step 2: 跑 CLI，确认失败**

Run:

```bash
pnpm --filter @nnnb/docs test:changelog
```

Expected: exit 1。至少出现：

```text
[changelog] FAIL file exists
[changelog] FAIL file non-empty
[changelog] FAIL has Unreleased
[changelog] FAIL has 1.0.5 date
[changelog] FAIL docs-only excluded
[changelog] FAIL earlier versions note
```

- [ ] **Step 3: 写入根目录 CHANGELOG.md（规格原文，不改写）**

创建 `CHANGELOG.md`（与根 `package.json` 同级），全文如下：

```markdown
# Changelog

本文件记录公开发布的 `@nnnb/markdown`。文档站（`packages/docs`）与 playground（`packages/simple`）的改动不记在这里。

## [Unreleased]

暂无尚未发布的包改动。

## [1.0.5] - 2026-09-08

### Changed

- 对齐 v1.0.4 的发布入口，并固定本次 Demo / Mermaid 相关版本。

### Added

- Mermaid 预览导出改为从已渲染 SVG 栅格化 PNG，不再用 html2canvas 截预览容器。

## 更早版本

1.0.4 及更早版本未公开完整日志。
```

- [ ] **Step 4: 再跑 CLI，确认通过**

Run:

```bash
pnpm --filter @nnnb/docs test:changelog
```

Expected: exit 0，六条均为 `[changelog] ok …`。

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md packages/docs/src/changelog/cli.ts packages/docs/package.json
git commit -m "docs: add @nnnb/markdown changelog source and content checks"
```

---

### Task 2: `/changelog` 页、别名、路由、顶栏

**Files:**
- Modify: `packages/docs/src/changelog/cli.ts`
- Modify: `packages/docs/vite.config.ts`
- Modify: `packages/docs/tsconfig.json`
- Create: `packages/docs/src/pages/Changelog.vue`
- Modify: `packages/docs/src/router/index.ts`
- Modify: `packages/docs/src/App.vue`

**Interfaces:**
- Consumes: 根目录 `CHANGELOG.md`（Task 1）
- Produces:
  - Vite / TS 别名 `@repo` → 仓库根
  - `import changelogMarkdown from '@repo/CHANGELOG.md?raw'`
  - 路由 `path: '/changelog'`、`name: 'Changelog'`
  - 顶栏 `to="/changelog"` 文案「更新日志」
  - `MarkdownFeatures` 仅 `gfm`/`breaks` 为 true，其余显式 false

- [ ] **Step 1: 扩展 CLI（站点接线，预期失败）**

在 `packages/docs/src/changelog/cli.ts` 的 `process.exit` 之前追加：

```ts
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
```

- [ ] **Step 2: 跑 CLI，确认新断言失败**

Run:

```bash
pnpm --filter @nnnb/docs test:changelog
```

Expected: Task 1 的六条仍 ok；新增四条 FAIL：

```text
[changelog] FAIL nav changelog link
[changelog] FAIL router path
[changelog] FAIL page raw import
[changelog] FAIL mermaid off
```

exit 1。

- [ ] **Step 3: Vite `@repo` 别名与 tsconfig paths**

`packages/docs/vite.config.ts` 的 `resolve.alias` 改为：

```ts
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@repo': path.resolve(__dirname, '../..')
    }
```

`packages/docs/tsconfig.json` 的 `compilerOptions.paths` 改为：

```json
    "paths": {
      "@/*": ["src/*"],
      "@repo/*": ["../../*"]
    }
```

`vite-env.d.ts` 已 `/// <reference types="vite/client" />`，`*?raw` 由 Vite 客户端类型提供，不要再声明一份 md 模块。

- [ ] **Step 4: Changelog 页**

创建 `packages/docs/src/pages/Changelog.vue`：

```vue
<script lang="ts" setup>
import { computed } from 'vue';
import {
  MarkdownRenderer,
  type MarkdownFeatures
} from '@nnnb/markdown-ui';
import changelogMarkdown from '@repo/CHANGELOG.md?raw';

/**
 * 更新日志页：渲染仓库根 CHANGELOG.md。
 * 只开 GFM / 换行，避免 DEFAULT_MARKDOWN_FEATURES 全开。
 */
const features: Partial<MarkdownFeatures> = {
  gfm: true,
  breaks: true,
  math: false,
  mermaid: false,
  think: false,
  codeHighlight: false,
  customTags: false,
  elTable: false,
  httpResource: false
};

const source = computed(() =>
  typeof changelogMarkdown === 'string' ? changelogMarkdown : ''
);

const hasContent = computed(() => source.value.trim().length > 0);
</script>

<template>
  <article class="changelog-page">
    <header class="changelog-page__header">
      <h1 class="changelog-page__title">更新日志</h1>
      <p class="changelog-page__lead">记录 `@nnnb/markdown` 的公开发布。</p>
    </header>
    <MarkdownRenderer
      v-if="hasContent"
      class="changelog-page__body"
      :source="source"
      :features="features"
    />
    <p v-else class="changelog-page__error">无法加载更新日志。</p>
  </article>
</template>

<style scoped>
.changelog-page {
  max-width: 760px;
}

.changelog-page__title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.changelog-page__lead {
  margin: 0 0 28px;
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
}

.changelog-page__error {
  margin: 0;
  font-size: 15px;
  color: #b91c1c;
}

.changelog-page__body {
  color: #0f172a;
}
</style>
```

副文必须是「记录 `@nnnb/markdown` 的公开发布。」（含句号）。空字符串才显示「无法加载更新日志。」，不要 toast。

- [ ] **Step 5: 路由**

在 `packages/docs/src/router/index.ts` 的 `/scenes` 路由对象之后、第一个 `/test/` 路由之前插入：

```ts
    {
      path: '/changelog',
      name: 'Changelog',
      component: () => import('@/pages/Changelog.vue')
    },
```

不要改 catch-all。不要把 `Changelog` 加入 `App.vue` 的 `isWidePage` / `TEST_ROUTE_NAMES`。

- [ ] **Step 6: 顶栏**

在 `packages/docs/src/App.vue` 中，「业务场景」那个 `RouterLink` 结束之后、「GFM」那个 `RouterLink` 之前插入：

```vue
        <RouterLink to="/changelog" class="docs-nav-link" active-class="is-active">
          更新日志
        </RouterLink>
```

保持现有 `docs-nav-link` 样式，不新增折叠菜单。

- [ ] **Step 7: 再跑 CLI，确认十条通过**

Run:

```bash
pnpm --filter @nnnb/docs test:changelog
```

Expected: exit 0。输出十条 `[changelog] ok …`（六条文件 + nav / router / raw import / mermaid off）。

- [ ] **Step 8: Commit**

```bash
git add packages/docs/src/changelog/cli.ts packages/docs/vite.config.ts packages/docs/tsconfig.json packages/docs/src/pages/Changelog.vue packages/docs/src/router/index.ts packages/docs/src/App.vue
git commit -m "feat(docs): render changelog page from repo CHANGELOG.md"
```

---

### Task 3: 浏览器核对

**Files:**
- 无新文件。若渲染失败，只修 Task 2 范围内的 docs 接线，不改 `CHANGELOG.md` 口径。

**Interfaces:**
- Consumes: Task 2 的 `/changelog`
- Produces: 手动验收记录（顶栏高亮、1.0.5 两条可见、默认内容宽）

- [ ] **Step 1: 确认 docs dev 在 8002**

若尚未运行：

```bash
pnpm --filter @nnnb/docs dev
```

Expected: Vite 监听 `http://localhost:8002/`。

- [ ] **Step 2: 打开更新日志页**

浏览器打开 `http://localhost:8002/changelog`。

核对：

1. 顶栏「更新日志」为当前项（蓝底 `is-active`）。
2. `h1` 为「更新日志」。
3. 能看到「暂无尚未发布的包改动。」
4. 能看到「1.0.5」以及 Changed / Added 各一条（发布入口、SVG 栅格化 PNG）。
5. 能看到「1.0.4 及更早版本未公开完整日志。」
6. 主区不是 Demo 那种通栏：与首页同属默认 `docs-main`（有左右留白）。
7. 没有出现 mermaid 工具栏、公式块、HTTP 卡片。

- [ ] **Step 3: 从顶栏往返**

点「业务场景」再点回「更新日志」。预期仍渲染同一份 `CHANGELOG.md`，不空白、不报错。

- [ ] **Step 4: graphify**

在仓库根执行：

```bash
graphify update .
```

Expected: exit 0。`hooks.json` / `extensions.json` 的 zero-node 警告可忽略。

- [ ] **Step 5: Commit（仅当 Step 2–3 修过代码）**

若无代码改动则跳过。若有：

```bash
git add packages/docs
git commit -m "fix(docs): correct changelog page rendering"
```

---

## Self-Review

**Spec coverage**

| Spec 项 | 任务 |
| --- | --- |
| 根 `CHANGELOG.md` 原文、Unreleased、1.0.5、更早版本 | Task 1 |
| docs-only 不记 | Task 1 正文 + CLI `文档站`/`不记` |
| `@repo` + `?raw`、禁止 src 副本 | Task 2 |
| `Changelog.vue` 显式 features、空内容文案 | Task 2 |
| 路由 `/changelog` 在 scenes 与 test 之间 | Task 2 |
| 顶栏位置与文案 | Task 2 |
| 不进 `isWidePage`、不改 Home | Global + Task 2/3 |
| CLI 8 类断言（文件 5 + 接线 4，共 10 条 check） | Task 1–2 |
| 浏览器验收 | Task 3 |

**占位符：** 无 TBD /「类似 Task N」。  
**类型：** `@repo` 在 Vite 与 tsconfig 均为仓库根；raw 导入路径均为 `@repo/CHANGELOG.md?raw`。
