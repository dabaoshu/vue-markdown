# @nnnb/markdown

[在线 demo](https://dabaoshu.github.io/vue-markdown) · [按需引入指南](./USAGE.md)

Vue 3 Markdown 渲染能力集合，按「引擎层 / UI 层」分离组织，支持：

- Markdown 渲染（`VueMarkdown`，基于 unified / remark / rehype）
- 代码高亮（`highlight.js` 或 `refractor` 双引擎，自带 VSCode 风格 `codeLight` 主题）
- 数学公式（`remark-math` + `rehype-katex`，内置 LaTeX `\[...\]` / `\(...\)` 预处理）
- Mermaid 图表（`mermaid` / `beautiful-mermaid` 双引擎，SVG / ASCII 输出，流式渲染、加载态/错误态遮罩、代码块 meta 覆盖）
- 自定义标签（`remark-think`，支持 `<think>` 等块级自定义标签）
- 引擎工具（表格解析、代码块替换为组件、渲染时序控制、JSON→Mermaid、SVG 导出 PNG 等）

## 安装

```bash
pnpm add @nnnb/markdown
```

对等依赖（需在业务项目自行安装，按需选择）：

```bash
# 基础（代码高亮 + 工具）
pnpm add highlight.js lodash
# refractor 引擎（若使用 generatorType='refractor'）
pnpm add refractor
# 数学公式
pnpm add rehype-katex remark-math
# Mermaid（mermaid / beautiful-mermaid 已作为 dependencies 自动安装，无需手动添加）
```

> `vue` 需作为对等依赖由业务项目提供（`^3.0.0`）。

## 导入边界（重要）

- 引擎能力（无框架绑定）：`@nnnb/markdown`
- Vue UI 组件：`@nnnb/markdown/vue-ui`

```ts
// 引擎层：插件、纯函数、类型
import { rehypeMermaid, remarkThink, highlightTohtml, refractorToHtml } from '@nnnb/markdown';
// UI 层：Vue 组件
import { VueMarkdown, CodeHighLight, MermaidBlock, codeLight } from '@nnnb/markdown/vue-ui';
```

> 使用 `@nnnb/markdown/vue-ui` 子路径时，消费方 `tsconfig.json` 的 `moduleResolution` 需为 `"bundler"` / `"node16"` / `"nodenext"`（旧版 `"node"` 不识别 `exports` 子路径）。

## 快速开始

### 1. 基础渲染

```vue
<template>
  <VueMarkdown :source="markdownContent" />
</template>

<script setup lang="ts">
import { VueMarkdown } from '@nnnb/markdown/vue-ui';

const markdownContent = `# Hello\n\n这是一个公式：$E=mc^2$`;
</script>
```

`source` 也可通过默认插槽传入。

### 2. 代码高亮

```vue
<template>
  <VueMarkdown :source="md" :components="{ code: CodeHighLight } />
</template>

<script setup lang="ts">
import { VueMarkdown, CodeHighLight } from '@nnnb/markdown/vue-ui';
import 'highlight.js/styles/github.css'; // 可选：使用 highlight.js 自带主题

const md = '```ts\nconst a: number = 1;\n```';
</script>
```

`CodeHighLight` 自带 VSCode 深色主题样式（随组件加载），也可使用 `codeLight` 样式对象自行注入：

```ts
import { codeLight } from '@nnnb/markdown/vue-ui';
// codeLight 是一份 { [selector]: CSSProperties } 样式表，可用于自定义主题方案
```

### 3. 数学公式

```vue
<template>
  <VueMarkdown :source="md" :math="{ strict: true }" />
</template>

<script setup lang="ts">
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import 'katex/dist/katex.min.css';

const md = '行内 $E=mc^2$，块级：\n\n$$\\int_0^1 x^2 dx$$';
</script>
```

`math` 传 `null` 可关闭数学公式支持。引擎层另导出 `preprocessLaTeX` / `preprocessMath` 用于手动预处理 LaTeX 写法。

### 4. Mermaid 图表

通过 `rehypeMermaid` 引擎插件把 ` ```mermaid ` 代码块替换为 `MermaidBlock` 组件：

```vue
<template>
  <VueMarkdown
    :source="md"
    :rehype-plugins="[[rehypeMermaid, { engine: 'mermaid' }]]"
    :components="{ 'mermaid-block': MermaidBlock }"
  />
</template>

<script setup lang="ts">
import { rehypeMermaid } from '@nnnb/markdown';
import { VueMarkdown, MermaidBlock } from '@nnnb/markdown/vue-ui';

const md = '```mermaid\nflowchart LR\n  A --> B\n```';
</script>
```

支持能力：

- 双引擎：`engine: 'mermaid'`（原生 mermaid）或 `'beautiful'`（beautiful-mermaid，支持 SVG / ASCII 输出与主题色字段）
- 流式渲染：`streamLoading` 检测未闭合 fence，配合 `streamErrorGraceMs` / `streamPendingText` 避免半截语法误报
- 加载/错误遮罩：`showLoading`、`loadingText`、`errorText`、`loadingDelayMs`、`minLoadingMs`
- 代码块 meta 覆盖：` ```mermaid engine=beautiful output=ascii `（受 `enableMetaOptions` 控制，默认开启）
- 空代码回退：`fallbackMode: 'keep-code' | 'placeholder'`（默认 `keep-code`）

`MermaidBlock` 也可独立使用：

```vue
<template>
  <MermaidBlock :code="'flowchart LR\n  A --> B'" engine="mermaid" />
</template>
```

### 5. 自定义标签（think）

通过 `customElements` 声明块级自定义标签，内部自动接入 `remark-think`：

```vue
<template>
  <VueMarkdown :source="md" :custom-elements="['think', 'custom']" />
</template>

<script setup lang="ts">
import { VueMarkdown } from '@nnnb/markdown/vue-ui';

const md = '<think>\n正在思考...\n</think>';
</script>
```

引擎层可单独使用 `remarkThink`（`ThinkFlowOption: { tags, customTags }`）与 `thinkSyntax`。

## VueMarkdown 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `source` | `string` | Markdown 原文（必填，或通过默认插槽传入） |
| `components` | `Record<string, any>` | 自定义渲染组件映射，如 `{ code: CodeHighLight, 'mermaid-block': MermaidBlock }` |
| `customElements` | `string[]` | 自定义块级标签名单，自动接入 `remark-think` |
| `math` | `{ strict?; remarkOptions?; rehypeOptions? } \| null` | 数学公式配置，`null` 关闭 |
| `remarkPlugins` | `any[]` | remark 插件 |
| `rehypePlugins` | `any[]` | rehype 插件 |
| `remarkRehypeOptions` | `object` | remark-rehype 配置 |
| `allowedElements` / `disallowedElements` / `allowElement` | — | 元素白/黑名单与过滤 |
| `skipHtml` / `unwrapDisallowed` / `urlTransform` | — | HTML 跳过、解包、URL 改写 |

## CodeHighLight 组件

```vue
<CodeHighLight :code="code" language="ts" generator-type="highlight" :auto-match="true" />
```

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `code` | `string` | — | 代码内容（必填） |
| `language` | `string` | `''` | 语言；为空时 `autoMatch` 自动识别 |
| `generatorType` | `'highlight' \| 'refractor'` | `'highlight'` | 高亮引擎 |
| `autoMatch` | `boolean` | `true` | 自动语言识别（highlight 引擎） |
| `ignoreIllegals` | `boolean` | `true` | 忽略非法语法（highlight 引擎） |
| `theme` | `Record<string, unknown>` | `{}` | 主题对象（refractor 引擎） |

## MermaidBlock 组件

继承 `MermaidRenderOptions` + `MermaidEngineOptions`，主要参数：

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `code` | `string` | — | Mermaid DSL（必填） |
| `engine` | `'mermaid' \| 'beautiful'` | `'mermaid'` | 渲染引擎 |
| `mermaidConfig` | `MermaidConfig` | — | 原生 mermaid 配置 |
| `beautifulOptions` | `{ output?; svg?; ascii? }` | — | beautiful-mermaid 配置（`output: 'svg' \| 'ascii'`） |
| `renderSvg` | `boolean` | `true` | 是否渲染可视输出；`false` 时仅展示源码 |
| `showLoading` | `boolean` | — | 是否显示加载遮罩 |
| `loadingText` / `errorText` | `string` | — | 遮罩文案 |
| `loadingDelayMs` | `number` | `180` | 加载遮罩延迟显示 |
| `minLoadingMs` | `number` | `260` | 加载遮罩最短展示 |
| `streamLoading` | `boolean` | — | 流式输入中标记（未闭合 fence） |
| `streamErrorGraceMs` | `number` | `420` | 流式错误宽限 |
| `streamPendingText` | `string` | `'Streaming diagram...'` | 流式宽限文案 |
| `onRender` / `onError` | `() => void` / `(e: Error) => void` | — | 渲染成功/失败回调 |

## 引擎能力（`@nnnb/markdown`）

| 模块 | 主要导出 | 说明 |
| --- | --- | --- |
| `markdown` | `CreateVMarkdown`, `MarkdownOptions`, `defaultUrlTransform`, `preprocessLaTeX`, `preprocessMath`, `processThink` | 核心 markdown→JSX 渲染、数学公式与 think 预处理 |
| `remark-think` | `remarkThink`, `thinkSyntax`, `ThinkFlowOption` | 自定义块级标签解析 |
| `codeHighLight` | `highlightTohtml`, `refractorToHtml`, `getCodeClassName` | 代码高亮纯函数 |
| `remark-mermaid` | `rehypeMermaid`, `jsonToMermaid`, `extractExternalResourceRefs`, `rasterizeSvgToCanvas`, `downloadSvgAsPng`, `copySvgAsPng` | Mermaid rehype 插件、JSON→DSL、SVG 导出工具 |
| `componentsUtils` | `tableNodeParse`, `replaceCodeFenceToComponent`, `createRenderTimingController`, `mergeThinkRemark`, `mergeThinkRehype` | 表格解析、代码块替换为组件、渲染时序控制、think 合并 |

## 分层说明

本包按 engine-only 原则组织：

- `core/`：类型、纯函数、基础协议
- `engine/`：流程编排与核心处理（不依赖框架运行时）
- `ui/` / `vue-ui.ts`：Vue 组件与 UI 导出
- `adapters/`：与外部环境（DOM / Node / 框架）对接的适配层

默认入口只导出引擎能力，UI 组件统一从 `@nnnb/markdown/vue-ui` 导出，避免引擎与框架耦合。

## 实验性 / 规划中

以下模块已实现，但暂未从公开入口（`@nnnb/markdown`、`@nnnb/markdown/vue-ui`）导出，属于实验性能力，API 可能调整：

- `markdown-export`：基于 DOM 截图的 PDF / 图片导出（`MarkdownExportHost`、`ExportToolbar`、`ExportPreviewModal`）
- `iframe-embed`：通过 iframe 安全嵌入外部内容（`IframeEmbed`）

> 注意：`package.json` 的 `exports` 目前仅暴露 `.` 与 `./vue-ui`，未列入 `exports` 的子路径会被解析拦截。上述模块在正式纳入 `exports` 前，无法通过 `@nnnb/markdown/xxx` 子路径从外部引入。

## 兼容说明

- 历史 `markdown.ts` 入口仍保留，`CreateVMarkdown` 旧导出名继续可用。
- `@nnnb/markdown/vue-ui` 子路径需要消费方支持 `exports` 字段（见「导入边界」）。

## 许可证

[MIT License](LICENSE)
