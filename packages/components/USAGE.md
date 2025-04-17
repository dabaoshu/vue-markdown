# 按需引入指南

为了减少应用程序的最终打包体积，你可以按需引入 `@nnnb/markdown` 的组件和功能。以下是几种不同的引入方式，按照打包体积从小到大排序。

## 1. 基础 Markdown 组件（最小体积）

如果你只需要基础的 Markdown 渲染功能，不需要代码高亮和数学公式支持：

```js
import { VueMarkdown } from '@nnnb/markdown/markdown';
```

这样只会引入基础的 Markdown 解析和渲染功能。

## 2. 带代码高亮的 Markdown 组件

如果你需要代码高亮功能：

```js
// 引入组件
import { VueMarkdown } from '@nnnb/markdown/markdown';
import { HighlightOptions } from '@nnnb/markdown/codeHighLight';

// 引入高亮样式（可选择喜欢的主题）
import 'highlight.js/styles/github.css';
```

然后在组件中配置：

```vue
<template>
  <VueMarkdown 
    :source="markdownContent"
    :components="{ 
      code: (props) => <code class="hljs-code" {...props} />
    }"
  />
</template>
```

## 3. 带数学公式支持的 Markdown 组件

如果你需要数学公式支持：

```js
import { VueMarkdown } from '@nnnb/markdown/markdown';
import 'katex/dist/katex.min.css';

// 在组件中使用
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

如果你需要所有功能：

```js
import { VueMarkdown } from '@nnnb/markdown';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
```

## 优化依赖体积的建议

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

4. **分离代码**：将 markdown 渲染功能与其他功能分离到不同的包中，以便按需加载

使用这些策略，你可以显著减少最终打包的体积，提高应用程序的加载性能。 