# 按需引入指南

为了减少应用最终体积，建议按“引擎能力”和“Vue UI 能力”分开引入：

- 引擎能力（无框架绑定）：`@nnnb/markdown`
- Vue UI 能力（组件）：`@nnnb/markdown/vue-ui`

## 1. 基础 Markdown 组件（最小体积）

如果你只需要 Markdown 渲染组件：

```js
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
```

这会使用 Vue UI 入口，不额外引入你未使用的插件能力。

## 2. 带代码高亮的 Markdown 组件

如果你需要代码高亮：

```js
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import { CodeHighLight } from '@nnnb/markdown/vue-ui';
import 'highlight.js/styles/github.css';
```

在 `VueMarkdown` 的 `components` 中注入：

```vue
<template>
  <VueMarkdown
    :source="markdownContent"
    :components="{ code: CodeHighLight }"
  />
</template>
```

## 3. 带数学公式支持的 Markdown 组件

如果你需要 KaTeX 数学公式支持：

```js
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import 'katex/dist/katex.min.css';

const mathOptions = {
  strict: true,
  remarkOptions: {},
  rehypeOptions: {}
};
```

然后在模板中：

```vue
<template>
  <VueMarkdown :source="markdownContent" :math="mathOptions" />
</template>
```

## 4. 完整功能（最大体积）

如果你需要 markdown + 高亮 + 数学公式：

```js
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import { CodeHighLight } from '@nnnb/markdown/vue-ui';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
```

## 5. 仅使用引擎能力（无 UI）

如果你只需要插件或引擎函数：

```ts
import { rehypeMermaid, highlightTohtml, refractorToHtml } from '@nnnb/markdown';
```

## 体积优化建议

1. **Tree-shaking**：确保你的构建工具支持 tree-shaking，以剔除未使用的代码
   
2. **CDN 引入大型依赖**：对于 KaTeX 等较大的依赖，考虑通过 CDN 引入：
   ```html
   <!-- 在 HTML 中引入 -->
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">
   ```

3. **按需加载**：在需要时动态导入某些组件
   ```js
   // 在需要时才加载数学公式相关功能
   const loadMathSupport = async () => {
     await import('katex/dist/katex.min.css');
     // 其他逻辑...
   };
   ```

4. **分层引入**：优先从 `@nnnb/markdown` 引入引擎能力，只有需要 Vue 组件时再引入 `@nnnb/markdown/vue-ui`

使用这些策略，你可以显著减少最终打包的体积，提高应用程序的加载性能。 