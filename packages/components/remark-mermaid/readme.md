# remark-mermaid

## 模块说明

`remark-mermaid` 用于在 Markdown 渲染流程中识别 ```mermaid``` 代码块，并将其转换为 `MermaidBlock` 组件节点。

当前实现按 engine-only 规则分层：

- `core/`：类型定义（`MermaidBlockProps`、`RehypeMermaidOptions`）
- `engine/`：`rehypeMermaid` 插件（不依赖 Vue 运行时）
- `ui/`：`MermaidBlock` Vue 渲染组件

## 导入边界

- 引擎能力（插件、类型）从默认入口导入：`@nnnb/markdown`
- Vue UI 组件从 UI 入口导入：`@nnnb/markdown/vue-ui`

## 快速使用

```ts
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import { rehypeMermaid } from '@nnnb/markdown';
import { MermaidBlock } from '@nnnb/markdown/vue-ui';

const source = `
\`\`\`mermaid
graph TD
  A[Start] --> B{Check}
  B -->|Yes| C[Done]
  B -->|No| D[Retry]
\`\`\`
`;

const rehypePlugins = [
  [
    rehypeMermaid,
    {
      showLoading: true,
    }
  ]
];

const components = {
  MermaidBlock
};
```

在 `VueMarkdown` 中传入：

```vue
<template>
  <VueMarkdown
    :source="source"
    :rehypePlugins="rehypePlugins"
    :components="components"
  />
</template>
```

## rehypeMermaid 参数

`rehypeMermaid(options?: RehypeMermaidOptions)`

- `mermaidConfig`：Mermaid 初始化配置
- `showLoading`：是否显示加载态，默认 `true`
- `enableMetaOptions`：是否启用代码块级 meta 覆盖，默认 `true`
- `fallbackMode`：空 Mermaid 代码块回退策略，支持 `keep-code | placeholder`

## MermaidBlock Props

- `code`：Mermaid DSL 文本（必填）
- `mermaidConfig`：Mermaid 初始化配置
- `id`：图表 id，不传时自动生成
- `className`：容器类名，默认 `mermaid-block`
- `showLoading`：是否显示加载态
- `onRender`：渲染成功回调
- `onError`：渲染失败回调

## 测试用例（建议回归清单）

### 用例 1：基础渲染

```md
```mermaid
graph LR
  A --> B
```
```

预期：渲染出 SVG 图。

### 用例 2：块级 meta 覆盖

```md
```mermaid renderSvg=false showLoading=false
graph TD
  A --> B
```
```

预期：该块不渲染 SVG，仅展示源码；不显示加载态。

### 用例 3：空代码块回退

```md
```mermaid
```
```

预期：
- `fallbackMode='keep-code'` 时保留原始 `<pre><code>`
- `fallbackMode='placeholder'` 时替换为 `MermaidBlock`

### 用例 4：非法 DSL

```md
```mermaid
graph TD
  A ->-> B
```
```

预期：进入错误态，或在流式宽限期内展示 pending 文案。

### 用例 5：cacheKey 稳定性

输入同一份代码与同一配置，预期生成相同 `cacheKey`；任一项变更，`cacheKey` 应变化。
