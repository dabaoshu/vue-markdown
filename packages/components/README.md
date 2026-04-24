# @nnnb/markdown

Vue 3 Markdown 渲染能力集合，支持：

- Markdown 渲染
- 代码高亮（highlight.js / refractor）
- 数学公式（remark-math + rehype-katex）
- 自定义标签与插件扩展

## 安装

```bash
pnpm add @nnnb/markdown
```

对等依赖（需在业务项目安装）：

```bash
pnpm add highlight.js lodash
```

如需数学公式支持：

```bash
pnpm add rehype-katex remark-math
```

## 导入边界（重要）

- 引擎能力（无框架绑定）从 `@nnnb/markdown` 导入
- Vue UI 组件从 `@nnnb/markdown/vue-ui` 导入

```ts
import { rehypeMermaid, highlightTohtml } from '@nnnb/markdown';
import { VueMarkdown, CodeHighLight } from '@nnnb/markdown/vue-ui';
```

## 快速开始

```vue
<template>
  <VueMarkdown
    :source="markdownContent"
    :components="{ code: CodeHighLight }"
    :customElements="['think', 'custom']"
  />
</template>

<script setup lang="ts">
import { VueMarkdown, CodeHighLight } from '@nnnb/markdown/vue-ui';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

const markdownContent = `
# Hello

这是一个公式：$E=mc^2$
`;
</script>
```

## VueMarkdown 常用参数

- `source: string` markdown 原文
- `components?: Record<string, any>` 自定义渲染组件
- `customElements?: string[]` 自定义标签名单
- `remarkPlugins?: any[]` remark 插件
- `rehypePlugins?: any[]` rehype 插件
- `math?: { strict?: boolean; remarkOptions?: any; rehypeOptions?: any }`
- `allowedElements?` / `disallowedElements?` / `allowElement?`
- `skipHtml?` / `unwrapDisallowed?` / `urlTransform?`

## CodeHighLight 组件

```vue
<template>
  <CodeHighLight :code="code" language="ts" />
</template>
```

支持：

- `generatorType: 'highlight' | 'refractor'`
- `autoMatch`
- `ignoreIllegals`
- `theme`（refractor 模式）

## 分层说明

当前包已按 engine-only 原则整理：

- `core/`：类型、纯函数、基础插件
- `engine/`：流程编排与核心处理
- `ui/` / `vue-ui.ts`：Vue 组件与 UI 导出

默认入口不会混出 UI 组件，避免引擎与框架耦合。

## 兼容说明

- 历史 `markdown.ts` 入口仍保留，用于兼容旧代码
- 旧导出名 `CreateVMarkdown` 仍可用

## 许可证

[MIT License](LICENSE)
