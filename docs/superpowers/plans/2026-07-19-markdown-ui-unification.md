# Markdown UI Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `@nnnb/markdown-ui`，把 docs/simple 的重复 Markdown UI 与编辑器工作台统一为稳定组件入口和案例入口，同时保留 docs 行为与 simple 导出能力。

**Architecture:** `@nnnb/markdown-ui` 只依赖 `@nnnb/markdown` 和 UI 运行时依赖；稳定组件从根入口导出，工作台从 `/examples` 导出。docs 注入案例数据，simple 通过工作台插槽与公开 `previewTarget` 组合导出，不互相依赖或读取内部 DOM。

**Tech Stack:** Vue 3.4、TypeScript 5.2、TSX、Vite 5、pnpm workspace、CodeMirror 6、Element Plus、Sass、Graphify 0.9.16。

## Global Constraints

- 新包目录必须为 `packages/markdown-ui`，包名必须为 `@nnnb/markdown-ui`。
- `@nnnb/markdown` 继续只承载 Markdown 基础能力与扩展能力。
- docs 与 simple 只能使用 `@nnnb/markdown-ui` 或 `@nnnb/markdown-ui/examples`，禁止深路径引用 `markdown-ui/src`。
- docs 当前视觉、Tab、格式化、功能开关、流式输入和预览行为不得改变。
- simple 必须保留 PDF 预览、PDF 导出和 PNG 导出。
- simple 导出必须读取公开 `previewTarget`，禁止查询工作台内部 CSS 类名。
- 每次删除副本前必须同时用 Graphify 反向依赖与 `rg` 确认无剩余消费者。
- 修改代码后必须运行 `graphify update .`。

---

## File Map

### New package

- `packages/markdown-ui/package.json`：包入口、依赖和构建脚本。
- `packages/markdown-ui/tsconfig.json`：Vue/TSX 类型检查配置。
- `packages/markdown-ui/vite.config.ts`：ES/CJS、声明文件和 CSS 构建。
- `packages/markdown-ui/src/index.ts`：稳定组件公开入口。
- `packages/markdown-ui/src/examples/index.ts`：案例入口。
- `packages/markdown-ui/src/components/markdown/*`：统一 MarkdownRenderer、代码块、Mermaid、Think UI。
- `packages/markdown-ui/src/components/editor/*`：CodeMirror 和编辑器辅助能力。
- `packages/markdown-ui/src/examples/workbench/*`：无 docs/simple 依赖的工作台案例。
- `packages/markdown-ui/test/package-contract.ts`：包入口与禁止深路径依赖的契约测试。
- `packages/markdown-ui/test/workbench-contract.ts`：工作台输入、插槽和 expose 类型契约。

### Consumers

- `packages/docs/package.json`：依赖 `@nnnb/markdown-ui`。
- `packages/docs/src/components/markdown/index.tsx`：改为稳定入口兼容转发，随后按引用情况删除。
- `packages/docs/src/demo/MarkdownDemoEditor.vue`：缩减为 docs 数据适配器。
- `packages/simple/package.json`：依赖 `@nnnb/markdown-ui`。
- `packages/simple/src/mdeditor/MarkdownEditor.vue`：改为工作台 + simple 导出适配器。

### Deletion candidates

- `packages/docs/src/components/markdown/*` 中已迁移文件。
- `packages/docs/src/demo/DemoCodeMirror.vue`、`DemoFeaturePanel.vue`、`DemoMobileTabs.vue`、`DemoSidebar.vue`、`editorActions.ts`、`editorHelper.ts`、`streamInputSimulator.ts`。
- `packages/simple/src/components/markdown/*`。
- `packages/simple/src/mdeditor/DemoTabsPanel.vue`、`demoData.ts`、`editorActions.ts`、`editorHelper.ts` 和仅供旧编辑器使用的 Mermaid 示例数据。
- `packages/simple/src/hooks/useStreamPlayback.ts`（仅在无其他消费者时）。

---

### Task 1: Scaffold `@nnnb/markdown-ui` with enforceable package boundaries

**Files:**
- Create: `packages/markdown-ui/package.json`
- Create: `packages/markdown-ui/tsconfig.json`
- Create: `packages/markdown-ui/vite.config.ts`
- Create: `packages/markdown-ui/src/index.ts`
- Create: `packages/markdown-ui/src/examples/index.ts`
- Create: `packages/markdown-ui/test/package-contract.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: package imports `@nnnb/markdown-ui` and `@nnnb/markdown-ui/examples`.
- Produces: scripts `build`, `typecheck`, `test:contract` in the new package.

- [ ] **Step 1: Write the failing package contract test**

Create `packages/markdown-ui/test/package-contract.ts`:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

assert.equal(pkg.name, '@nnnb/markdown-ui');
assert.ok(pkg.exports['.'], 'stable root export is required');
assert.ok(pkg.exports['./examples'], 'examples export is required');
assert.deepEqual(Object.keys(pkg.exports).sort(), ['.', './examples']);
assert.equal(pkg.dependencies['@nnnb/markdown'], 'workspace:^');

console.log('markdown-ui package contract: ok');
```

- [ ] **Step 2: Run the contract to verify it fails**

Run:

```powershell
pnpm exec esno packages/markdown-ui/test/package-contract.ts
```

Expected: FAIL because `packages/markdown-ui/package.json` does not exist.

- [ ] **Step 3: Create package configuration and empty public entries**

Create `packages/markdown-ui/package.json`:

```json
{
  "name": "@nnnb/markdown-ui",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "vite build",
    "typecheck": "vue-tsc --noEmit -p tsconfig.json",
    "test:contract": "esno test/package-contract.ts && esno test/workbench-contract.ts"
  },
  "exports": {
    ".": {
      "types": "./dist/es/src/index.d.ts",
      "import": "./dist/es/src/index.mjs",
      "require": "./dist/lib/src/index.js"
    },
    "./examples": {
      "types": "./dist/es/src/examples/index.d.ts",
      "import": "./dist/es/src/examples/index.mjs",
      "require": "./dist/lib/src/examples/index.js"
    }
  },
  "files": ["dist/", "package.json"],
  "sideEffects": ["**/*.scss", "**/*.css"],
  "dependencies": {
    "@nnnb/markdown": "workspace:^",
    "@codemirror/commands": "^6.8.1",
    "@codemirror/lang-markdown": "^6.2.0",
    "@codemirror/state": "^6.5.2",
    "@codemirror/view": "^6.36.8",
    "element-plus": "^2.9.5",
    "mermaid": "^11.14.0",
    "vue-codemirror": "^6.1.1"
  },
  "peerDependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.5",
    "@vitejs/plugin-vue-jsx": "^4.0.0",
    "esno": "^4.7.0",
    "sass": "^1.81.1",
    "vite": "^5.4.14",
    "vite-plugin-dts": "1.4.1",
    "vue": "^3.4.29",
    "vue-tsc": "^2.0.21"
  }
}
```

Create `packages/markdown-ui/src/index.ts` and `packages/markdown-ui/src/examples/index.ts` with only module markers initially:

```ts
export {};
```

Copy the compiler options pattern from `packages/components/tsconfig.json`, set `include` to `['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue', 'test/**/*.ts']`, and exclude `dist` and `node_modules`.

Create `vite.config.ts` using the external dependency detection and dual ES/CJS `preserveModules` output from `packages/components/vite.config.ts`, with entries:

```ts
lib: {
  entry: {
    index: path.resolve(__dirname, './src/index.ts'),
    examples: path.resolve(__dirname, './src/examples/index.ts')
  },
  name: 'markdown-ui'
}
```

Add root scripts:

```json
"build:ui": "pnpm --filter @nnnb/markdown-ui build",
"test:ui": "pnpm --filter @nnnb/markdown-ui test:contract"
```

- [ ] **Step 4: Install workspace links and run package checks**

Run:

```powershell
pnpm install --offline
pnpm exec esno packages/markdown-ui/test/package-contract.ts
pnpm --filter @nnnb/markdown-ui typecheck
pnpm --filter @nnnb/markdown-ui build
```

Expected: all commands exit 0; contract prints `markdown-ui package contract: ok`.

- [ ] **Step 5: Commit the package boundary**

```powershell
git add package.json pnpm-lock.yaml packages/markdown-ui
git commit -m "feat(ui): scaffold markdown ui package"
```

---

### Task 2: Move identical CodeBlock and Mermaid UI into the stable entry

**Files:**
- Create: `packages/markdown-ui/src/components/markdown/codeBlock.tsx`
- Create: `packages/markdown-ui/src/components/markdown/code_mermaid.tsx`
- Create: `packages/markdown-ui/src/components/markdown/code_mermaid_card.tsx`
- Create: `packages/markdown-ui/src/components/markdown/MermaidCanvasViewport.tsx`
- Modify: `packages/markdown-ui/src/index.ts`
- Modify: `packages/docs/src/components/markdown/index.tsx`
- Modify: `packages/simple/src/components/markdown/index.tsx`
- Test: `packages/markdown-ui/test/package-contract.ts`

**Interfaces:**
- Produces: named exports `CodeBlock`, `MermaidBlock`, `MermaidCard`, `MermaidCanvasViewport`.
- Consumers: docs/simple Markdown renderer wrappers import these symbols from `@nnnb/markdown-ui`.

- [ ] **Step 1: Extend the failing export contract**

Append to `package-contract.ts`:

```ts
const stableEntry = readFileSync(resolve(root, 'src/index.ts'), 'utf8');
for (const symbol of ['CodeBlock', 'MermaidBlock', 'MermaidCard', 'MermaidCanvasViewport']) {
  assert.match(stableEntry, new RegExp(`\\b${symbol}\\b`), `${symbol} must be exported`);
}
```

Run `pnpm --filter @nnnb/markdown-ui test:contract`.

Expected: FAIL with `CodeBlock must be exported`.

- [ ] **Step 2: Move the docs versions without behavior changes**

Use the docs files as the source of truth. Move their complete contents into the four new package files. Update only relative imports so they remain inside `packages/markdown-ui/src/components/markdown` or target `@nnnb/markdown`; do not change render logic, props, CSS classes, Mermaid options, or copy/download behavior.

Export the concrete names from `src/index.ts`:

```ts
export { default as CodeBlock } from './components/markdown/codeBlock';
export { default as MermaidBlock } from './components/markdown/code_mermaid';
export { default as MermaidCard } from './components/markdown/code_mermaid_card';
export { default as MermaidCanvasViewport } from './components/markdown/MermaidCanvasViewport';
```

If a source file currently uses a named rather than default export, preserve it and change the barrel to the actual export syntax; do not introduce a wrapper solely to rename it.

- [ ] **Step 3: Switch docs and simple render wrappers to package imports**

Replace local imports in both Markdown `index.tsx` files with:

```ts
import {
  CodeBlock,
  MermaidBlock,
  MermaidCard,
  MermaidCanvasViewport
} from '@nnnb/markdown-ui';
```

Keep each wrapper's current feature mapping unchanged in this task.

- [ ] **Step 4: Verify consumers and package**

Run:

```powershell
pnpm --filter @nnnb/markdown-ui test:contract
pnpm --filter @nnnb/markdown-ui build
pnpm --filter @nnnb/docs build
pnpm --filter @nnnb/simple build
```

Expected: all exit 0; docs/simple render the same component mappings.

- [ ] **Step 5: Commit stable primitive migration**

```powershell
git add packages/markdown-ui packages/docs/src/components/markdown packages/simple/src/components/markdown packages/docs/package.json packages/simple/package.json pnpm-lock.yaml
git commit -m "refactor(ui): share markdown code and mermaid components"
```

---

### Task 3: Unify MarkdownRenderer, ThinkElement, and MarkdownCodeMirror

**Files:**
- Create: `packages/markdown-ui/src/components/markdown/MarkdownRenderer.tsx`
- Create: `packages/markdown-ui/src/components/markdown/thinkElement.tsx`
- Create: `packages/markdown-ui/src/components/markdown/thinkElement.scss`
- Create: `packages/markdown-ui/src/components/editor/MarkdownCodeMirror.vue`
- Create: `packages/markdown-ui/src/components/editor/editorActions.ts`
- Create: `packages/markdown-ui/src/components/editor/editorHelper.ts`
- Modify: `packages/markdown-ui/src/index.ts`
- Modify: `packages/markdown-ui/test/package-contract.ts`

**Interfaces:**
- Produces: `MarkdownRenderer`, `MarkdownCodeMirror`, `EditorHelper`, `createToolbarItems`, `createShortcuts`, `ThinkElement`.
- Produces: `MarkdownFeatures` and `MarkdownRendererProps` types.

- [ ] **Step 1: Write stable API contract assertions**

Add these required names to the stable-entry loop:

```ts
'MarkdownRenderer',
'MarkdownCodeMirror',
'EditorHelper',
'createToolbarItems',
'createShortcuts',
'ThinkElement',
'MarkdownFeatures',
'MarkdownRendererProps'
```

Run the contract and expect failure on `MarkdownRenderer`.

- [ ] **Step 2: Move the docs implementations and make features explicit**

Move docs `thinkElement.tsx` and SCSS unchanged except imports. Move `DemoCodeMirror.vue` to `MarkdownCodeMirror.vue`, retaining its `modelValue`, `update:modelValue`, and `ready` contract. Move `editorHelper.ts` and `editorActions.ts` into the editor directory.

Extract docs `buildMarkdownRenderOptions()` and renderer setup into `MarkdownRenderer.tsx`. Define public types:

```ts
export interface MarkdownFeatures {
  gfm: boolean;
  math: boolean;
  breaks: boolean;
  mermaid: boolean;
  think: boolean;
  codeHighlight: boolean;
}

export interface MarkdownRendererProps {
  source: string;
  features?: Partial<MarkdownFeatures>;
}
```

Use the docs current defaults as `DEFAULT_MARKDOWN_FEATURES`. Preserve the existing `MergeThinkRemark`, `tableNodeParse`, `rehypeMermaid`, code block and think element mappings exactly.

- [ ] **Step 3: Export the stable API**

Add explicit barrel exports:

```ts
export { default as MarkdownRenderer } from './components/markdown/MarkdownRenderer';
export type { MarkdownFeatures, MarkdownRendererProps } from './components/markdown/MarkdownRenderer';
export { default as ThinkElement } from './components/markdown/thinkElement';
export { default as MarkdownCodeMirror } from './components/editor/MarkdownCodeMirror.vue';
export { EditorHelper } from './components/editor/editorHelper';
export { createToolbarItems, createShortcuts } from './components/editor/editorActions';
```

- [ ] **Step 4: Verify types, package build and existing docs tests**

Run:

```powershell
pnpm --filter @nnnb/markdown-ui test:contract
pnpm --filter @nnnb/markdown-ui typecheck
pnpm --filter @nnnb/markdown-ui build
pnpm --filter @nnnb/docs test:remark-think
pnpm --filter @nnnb/docs test:remark-gfm
pnpm --filter @nnnb/docs test:remark-math
pnpm --filter @nnnb/docs test:code-highlight
pnpm --filter @nnnb/docs test:rehype-mermaid
```

Expected: all exit 0 and the five suites report no failed cases.

- [ ] **Step 5: Commit the stable renderer/editor layer**

```powershell
git add packages/markdown-ui
git commit -m "feat(ui): add shared markdown renderer and editor primitives"
```

---

### Task 4: Extract the application-independent MarkdownWorkbench example

**Files:**
- Create: `packages/markdown-ui/src/examples/workbench/types.ts`
- Create: `packages/markdown-ui/src/examples/workbench/MarkdownWorkbench.vue`
- Create: `packages/markdown-ui/src/examples/workbench/WorkbenchSidebar.vue`
- Create: `packages/markdown-ui/src/examples/workbench/WorkbenchMobileTabs.vue`
- Create: `packages/markdown-ui/src/examples/workbench/WorkbenchFeaturePanel.vue`
- Create: `packages/markdown-ui/src/examples/workbench/WorkbenchLoading.vue`
- Create: `packages/markdown-ui/src/examples/workbench/streamInputController.ts`
- Create: `packages/markdown-ui/src/examples/workbench/style.scss`
- Modify: `packages/markdown-ui/src/examples/index.ts`
- Create: `packages/markdown-ui/test/workbench-contract.ts`

**Interfaces:**
- Produces: `MarkdownWorkbench` component.
- Produces: `WorkbenchTab`, `WorkbenchProps`, `MarkdownWorkbenchExpose`, `TabContentLoader`.
- Consumes: stable `MarkdownRenderer`, `MarkdownCodeMirror`, `EditorHelper`, editor actions and `MarkdownFeatures`.

- [ ] **Step 1: Write the failing workbench type contract**

Create `test/workbench-contract.ts`:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const types = readFileSync(resolve(root, 'src/examples/workbench/types.ts'), 'utf8');
const component = readFileSync(resolve(root, 'src/examples/workbench/MarkdownWorkbench.vue'), 'utf8');

for (const name of ['WorkbenchTab', 'WorkbenchProps', 'MarkdownWorkbenchExpose', 'TabContentLoader']) {
  assert.match(types, new RegExp(`export (interface|type) ${name}\\b`));
}
for (const model of ['source', 'activeTab', 'features']) {
  assert.match(component, new RegExp(`defineModel.*${model}|${model}.*defineModel`, 's'));
}
for (const slot of ['toolbar-start', 'toolbar-end', 'preview-actions']) {
  assert.match(component, new RegExp(`name=["']${slot}["']`));
}
assert.match(component, /defineExpose/);
assert.match(component, /previewTarget/);
assert.doesNotMatch(component, /@\/|packages\/docs|packages\/simple/);

console.log('markdown workbench contract: ok');
```

Run `pnpm --filter @nnnb/markdown-ui test:contract`.

Expected: FAIL because workbench files do not exist.

- [ ] **Step 2: Define the public workbench types**

Create `types.ts`:

```ts
import type { Ref } from 'vue';
import type { MarkdownFeatures } from '../../index';

export interface WorkbenchTab {
  id: string;
  label: string;
  description?: string;
  category?: string;
  defaultFeatures?: Partial<MarkdownFeatures>;
}

export type TabContentLoader = (tabId: string, signal: AbortSignal) => Promise<string>;

export interface WorkbenchProps {
  tabs: WorkbenchTab[];
  loadTabContent: TabContentLoader;
}

export interface MarkdownWorkbenchExpose {
  previewTarget: Readonly<Ref<HTMLElement | null>>;
  source: Readonly<Ref<string>>;
  reset(): Promise<void>;
  stopStream(): void;
}
```

- [ ] **Step 3: Extract the docs workbench with injected data**

Move the docs workbench template, styles and behavior into the new files. Replace docs-specific data access with:

```ts
const source = defineModel<string>('source', { required: true });
const activeTab = defineModel<string>('activeTab', { required: true });
const features = defineModel<MarkdownFeatures>('features', { required: true });
const props = defineProps<WorkbenchProps>();
const previewTarget = shallowRef<HTMLElement | null>(null);
```

On tab load, cancel the previous request and prevent stale writes:

```ts
let loadController: AbortController | undefined;

async function loadActiveTab(): Promise<void> {
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  tabLoading.value = true;
  loadError.value = null;
  try {
    const next = await props.loadTabContent(activeTab.value, controller.signal);
    if (controller.signal.aborted) return;
    source.value = next;
    baselineSource.value = next;
  } catch (error) {
    if (!controller.signal.aborted) loadError.value = error instanceof Error ? error.message : String(error);
  } finally {
    if (loadController === controller) tabLoading.value = false;
  }
}
```

Render the three named slots at the approved extension points and expose only:

```ts
defineExpose<MarkdownWorkbenchExpose>({
  previewTarget,
  source: readonly(source),
  reset: loadActiveTab,
  stopStream
});
```

Abort loading, stop streaming, and cancel preview timers in `onBeforeUnmount`.

- [ ] **Step 4: Export and verify the example entry**

Create `src/examples/index.ts`:

```ts
export { default as MarkdownWorkbench } from './workbench/MarkdownWorkbench.vue';
export type {
  MarkdownWorkbenchExpose,
  TabContentLoader,
  WorkbenchProps,
  WorkbenchTab
} from './workbench/types';
```

Run:

```powershell
pnpm --filter @nnnb/markdown-ui test:contract
pnpm --filter @nnnb/markdown-ui typecheck
pnpm --filter @nnnb/markdown-ui build
```

Expected: both contract scripts print `ok`; typecheck and build exit 0.

- [ ] **Step 5: Commit the workbench example**

```powershell
git add packages/markdown-ui
git commit -m "feat(ui): add extensible markdown workbench example"
```

---

### Task 5: Migrate docs to the shared package without behavior changes

**Files:**
- Modify: `packages/docs/package.json`
- Modify: `packages/docs/src/demo/MarkdownDemoEditor.vue`
- Modify: `packages/docs/src/demo/demoData.ts`
- Modify: `packages/docs/src/demo/demoFeatureConfig.ts`
- Modify: `packages/docs/src/demo/demoMarkdownLoader.ts`
- Modify: `packages/docs/src/pages/Demo.vue`
- Test: existing `packages/docs/src/test/**`

**Interfaces:**
- Consumes: `MarkdownWorkbench`, `WorkbenchTab`, `MarkdownFeatures`, `TabContentLoader`.
- Produces: unchanged `MarkdownDemoEditor` consumer contract: `v-model:active-tab`.

- [ ] **Step 1: Add a failing consumer import check**

Before adding the dependency, change only a temporary type-only import in `MarkdownDemoEditor.vue`:

```ts
import type { MarkdownWorkbenchExpose } from '@nnnb/markdown-ui/examples';
```

Run `pnpm --filter @nnnb/docs build`.

Expected: FAIL with unresolved `@nnnb/markdown-ui/examples`.

- [ ] **Step 2: Add the workspace dependency and adapt docs data**

Add to docs dependencies:

```json
"@nnnb/markdown-ui": "workspace:^"
```

Export a `WorkbenchTab[]` projection from `demoData.ts`. Keep existing IDs, labels, categories and descriptions. Adapt `loadDemoMarkdown` to the `TabContentLoader` signature:

```ts
export const loadWorkbenchTab: TabContentLoader = async (tabId, signal) => {
  const content = await loadDemoMarkdown(tabId as DemoTabId);
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  return content;
};
```

Map docs `DemoMarkdownFeatures` to the shared `MarkdownFeatures` type without renaming existing feature keys.

- [ ] **Step 3: Replace implementation with a thin docs adapter**

`MarkdownDemoEditor.vue` keeps its `activeTab` prop and emit, but renders the workbench:

```vue
<template>
  <MarkdownWorkbench
    v-model:source="source"
    v-model:active-tab="activeTabModel"
    v-model:features="features"
    :tabs="workbenchTabs"
    :load-tab-content="loadWorkbenchTab"
  />
</template>
```

The adapter owns only docs data projection and v-model compatibility. Do not duplicate editor state, stream control, preview scheduling, or component styles.

- [ ] **Step 4: Run all docs regression commands**

```powershell
pnpm install --offline
pnpm --filter @nnnb/docs test:remark-think
pnpm --filter @nnnb/docs test:remark-gfm
pnpm --filter @nnnb/docs test:remark-math
pnpm --filter @nnnb/docs test:code-highlight
pnpm --filter @nnnb/docs test:rehype-mermaid
pnpm --filter @nnnb/docs build
```

Expected: five suites report zero failures; build exits 0.

- [ ] **Step 5: Commit docs migration**

```powershell
git add packages/docs packages/markdown-ui pnpm-lock.yaml
git commit -m "refactor(docs): consume shared markdown workbench"
```

---

### Task 6: Migrate simple and preserve export enhancements through public APIs

**Files:**
- Modify: `packages/simple/package.json`
- Rewrite: `packages/simple/src/mdeditor/MarkdownEditor.vue`
- Create: `packages/simple/src/mdeditor/simpleWorkbenchData.ts`
- Preserve: simple export state and calls currently in `MarkdownEditor.vue`

**Interfaces:**
- Consumes: `MarkdownWorkbench`, `MarkdownWorkbenchExpose`, `WorkbenchTab`.
- Consumes: `captureTargetCanvas`, `buildPdfPreviewFromCanvas`, PDF/PNG export APIs from `@nnnb/markdown`.
- Produces: unchanged route component at `/mdeditor`.

- [ ] **Step 1: Add a failing public-API integration test**

Create `packages/simple/src/mdeditor/markdownEditor.contract.ts`:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(import.meta.dirname, 'MarkdownEditor.vue'), 'utf8');
assert.match(source, /@nnnb\/markdown-ui\/examples/);
assert.match(source, /previewTarget/);
assert.match(source, /toolbar-end|preview-actions/);
assert.doesNotMatch(source, /querySelector\([^)]*preview-content/);
assert.doesNotMatch(source, /\.\.\/components\/markdown/);
console.log('simple markdown editor integration contract: ok');
```

Run:

```powershell
pnpm exec esno packages/simple/src/mdeditor/markdownEditor.contract.ts
```

Expected: FAIL because the old editor imports `../components/markdown`.

- [ ] **Step 2: Add the dependency and isolate simple data**

Add `"@nnnb/markdown-ui": "workspace:^"` to simple dependencies. Create `simpleWorkbenchData.ts` exporting `simpleWorkbenchTabs`, `loadSimpleWorkbenchTab`, and initial `MarkdownFeatures`. Preserve current simple demo content only when it is intentionally different from docs; otherwise import shared example data only if that data is explicitly exported by `/examples`.

- [ ] **Step 3: Rewrite the route component as workbench plus export adapter**

Use:

```ts
import { MarkdownWorkbench, type MarkdownWorkbenchExpose } from '@nnnb/markdown-ui/examples';

const workbenchRef = ref<MarkdownWorkbenchExpose | null>(null);
const exportTarget = computed(() => workbenchRef.value?.previewTarget.value ?? null);
```

Render simple actions through a public slot:

```vue
<MarkdownWorkbench
  ref="workbenchRef"
  v-model:source="source"
  v-model:active-tab="activeTab"
  v-model:features="features"
  :tabs="simpleWorkbenchTabs"
  :load-tab-content="loadSimpleWorkbenchTab"
>
  <template #toolbar-end>
    <button :disabled="!exportTarget || exportBusy" @click="handlePreviewPdf">预览 PDF</button>
    <button :disabled="!exportTarget || exportBusy" @click="handleExportPdf">导出 PDF</button>
    <button :disabled="!exportTarget || exportBusy" @click="handleExportPng">导出 PNG</button>
  </template>
</MarkdownWorkbench>
```

Adapt existing export functions so their first guard is:

```ts
function requireExportTarget(): HTMLElement {
  const target = exportTarget.value;
  if (!target) throw new Error('Markdown 预览尚未准备完成');
  return target;
}
```

Retain existing PDF options, preview modal, busy lock, error reporting and cleanup. Remove editor implementation, direct CodeMirror state, local stream hook and local Markdown renderer imports.

- [ ] **Step 4: Verify integration and builds**

Run:

```powershell
pnpm install --offline
pnpm exec esno packages/simple/src/mdeditor/markdownEditor.contract.ts
pnpm --filter @nnnb/markdown-ui build
pnpm --filter @nnnb/simple build
pnpm --filter @nnnb/docs build
```

Expected: contract prints `ok`; all builds exit 0.

- [ ] **Step 5: Commit simple migration**

```powershell
git add packages/simple packages/markdown-ui pnpm-lock.yaml
git commit -m "refactor(simple): compose shared workbench with exports"
```

---

### Task 7: Remove duplicates, run full verification, and update Graphify

**Files:**
- Delete only confirmed-unused files listed in the File Map.
- Modify: `graphify-out/graph.json`
- Modify: generated Graphify analysis/report files.

**Interfaces:**
- Final invariant: no docs/simple deep import or duplicate Markdown UI implementation.

- [ ] **Step 1: Query reverse dependencies before every deletion group**

Run focused checks:

```powershell
graphify affected "packages/simple/src/components/markdown/index.tsx" --depth 3
graphify affected "packages/docs/src/components/markdown/index.tsx" --depth 3
graphify affected "DemoCodeMirror.vue" --depth 3
graphify affected "packages/simple/src/hooks/useStreamPlayback.ts" --depth 3
rg -n "components/markdown|DemoCodeMirror|DemoFeaturePanel|DemoSidebar|DemoMobileTabs|useStreamPlayback|mdeditor/editorHelper|mdeditor/editorActions" packages/docs/src packages/simple/src
```

Expected: each deletion candidate has no consumer outside the adapter files already migrated. If a consumer remains, migrate that consumer first and rerun both checks.

- [ ] **Step 2: Delete only proven-unused duplicates**

Remove the confirmed files with `apply_patch`. Do not delete `demoData.ts`, loaders, or feature configuration that remains an explicit docs/simple data provider.

- [ ] **Step 3: Enforce import boundaries**

Run:

```powershell
rg -n "packages/(docs|simple)|markdown-ui/src" packages/markdown-ui/src packages/docs/src packages/simple/src
rg -n "@nnnb/docs|@nnnb/simple" packages/markdown-ui packages/docs/src packages/simple/src
```

Expected: no results. Any result is a failure and must be replaced with a public package import or injected data.

- [ ] **Step 4: Run the complete verification suite**

```powershell
pnpm --filter @nnnb/markdown-ui test:contract
pnpm --filter @nnnb/markdown-ui typecheck
pnpm --filter @nnnb/markdown-ui build
pnpm --filter @nnnb/docs test:remark-think
pnpm --filter @nnnb/docs test:remark-gfm
pnpm --filter @nnnb/docs test:remark-math
pnpm --filter @nnnb/docs test:code-highlight
pnpm --filter @nnnb/docs test:rehype-mermaid
pnpm --filter @nnnb/docs build
pnpm exec esno packages/simple/src/mdeditor/markdownEditor.contract.ts
pnpm --filter @nnnb/simple build
```

Expected: every command exits 0; all test suites report zero failures.

- [ ] **Step 5: Update and inspect the knowledge graph**

```powershell
graphify update .
graphify query "@nnnb/markdown-ui MarkdownWorkbench MarkdownRenderer docs simple imports" --budget 5000
graphify diagnose multigraph --graph graphify-out/graph.json --json
```

Expected: graph update exits 0; query shows `markdown -> markdown-ui -> docs/simple`; diagnostics show zero dangling edges, self loops and duplicate edges.

- [ ] **Step 6: Commit cleanup and graph update**

```powershell
git add packages/markdown-ui packages/docs packages/simple package.json pnpm-lock.yaml graphify-out
git commit -m "refactor(ui): remove duplicated markdown implementations"
```

---

## Final Review Checklist

- [ ] `@nnnb/markdown-ui` exposes only `.` and `./examples`.
- [ ] Stable UI does not import examples.
- [ ] `markdown-ui` does not import docs/simple.
- [ ] docs/simple do not deep-import `markdown-ui/src`.
- [ ] docs behavior is unchanged under its existing tests and production build.
- [ ] simple exports use `MarkdownWorkbenchExpose.previewTarget` only.
- [ ] all duplicate deletion candidates were checked with Graphify and `rg`.
- [ ] full verification output is recorded before claiming completion.
