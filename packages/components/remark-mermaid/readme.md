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
      loadingText: '图表渲染中...',
      errorText: '图表渲染失败'
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
- `loadingText`：加载中文案
- `errorText`：失败文案

## MermaidBlock Props

- `code`：Mermaid DSL 文本（必填）
- `mermaidConfig`：Mermaid 初始化配置
- `id`：图表 id，不传时自动生成
- `className`：容器类名，默认 `mermaid-block`
- `loadingText`：加载文案
- `errorText`：失败文案
- `showLoading`：是否显示加载态
- `onRender`：渲染成功回调
- `onError`：渲染失败回调
