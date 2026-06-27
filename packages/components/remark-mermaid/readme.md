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
      engine: 'beautiful',
      beautifulOptions: {
        output: 'svg',
        svg: {
          theme: 'forest',
          transparent: true
        }
      },
      showLoading: true
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

- `engine`：渲染引擎，支持 `mermaid | beautiful`，默认 `mermaid`
- `mermaidConfig`：Mermaid 原生初始化配置，仅 `engine='mermaid'` 生效
- `beautifulOptions`：`beautiful-mermaid` 配置，仅 `engine='beautiful'` 生效
- `renderSvg`：是否渲染可视输出；`false` 时仅展示源码
- `showLoading`：是否显示加载态，默认 `true`
- `loadingDelayMs`：加载遮罩延迟毫秒数
- `minLoadingMs`：加载遮罩最短展示毫秒数
- `streamErrorGraceMs`：流式错误宽限毫秒数
- `streamPendingText`：流式宽限期提示文案
- `enableMetaOptions`：是否启用代码块级 meta 覆盖，默认 `true`
- `fallbackMode`：空 Mermaid 代码块回退策略，支持 `keep-code | placeholder`
- `injectCacheKey`：是否注入稳定缓存键，默认 `true`

## beautifulOptions 结构

```ts
{
  output?: 'svg' | 'ascii';
  svg?: {
    theme?: string;
    bg?: string;
    fg?: string;
    line?: string;
    accent?: string;
    muted?: string;
    surface?: string;
    border?: string;
    font?: string;
    padding?: number;
    nodeSpacing?: number;
    layerSpacing?: number;
    componentSpacing?: number;
    transparent?: boolean;
    interactive?: boolean;
  };
  ascii?: {
    useAscii?: boolean;
    paddingX?: number;
    paddingY?: number;
    boxBorderPadding?: number;
  };
}
```

说明：

- `svg.theme` 命中 `beautiful-mermaid` 内置 `THEMES` 时，会先展开主题色，再由显式颜色字段覆盖
- `output='ascii'` 时，组件输出 `<pre><code>` 文本图，不再注入 SVG

## MermaidBlock Props

- `code`：Mermaid DSL 文本（必填）
- `engine`：渲染引擎，默认 `mermaid`
- `mermaidConfig`：Mermaid 初始化配置
- `beautifulOptions`：beautiful-mermaid 渲染配置
- `renderSvg`：是否渲染图表；`false` 时仅显示源码
- `id`：图表 id，不传时自动生成
- `className`：容器类名，默认 `mermaid-block`
- `showLoading`：是否显示加载态
- `streamLoading`：上游流式生成期间的外部加载态
- `onRender`：渲染成功回调
- `onError`：渲染失败回调

## 代码块 meta 覆盖示例

### 1. 切换到 beautiful SVG 渲染

```md
\`\`\`mermaid engine=beautiful theme=forest transparent=true
flowchart LR
  A[Alpha] --> B[Beta]
\`\`\`
```

### 2. 输出 ASCII 图

```md
\`\`\`mermaid engine=beautiful output=ascii paddingX=2 paddingY=1
sequenceDiagram
  Alice->>Bob: Hello
\`\`\`
```

### 3. 保留源码，不渲染图表

```md
\`\`\`mermaid renderSvg=false showLoading=false
flowchart TD
  A --> B
\`\`\`
```

支持的常用 meta 键：

- 通用：`engine`、`renderSvg`、`showLoading`、`loadingDelayMs`、`minLoadingMs`、`streamErrorGraceMs`、`streamPendingText`、`className`、`id`
- beautiful SVG：`output`、`theme`、`bg`、`fg`、`line`、`accent`、`muted`、`surface`、`border`、`font`、`padding`、`nodeSpacing`、`layerSpacing`、`componentSpacing`、`transparent`、`interactive`
- beautiful ASCII：`useAscii`、`paddingX`、`paddingY`、`boxBorderPadding`

## 测试用例（建议回归清单）

### 用例 1：默认 Mermaid 渲染

```md
\`\`\`mermaid
graph LR
  A --> B
\`\`\`
```

预期：按原有 mermaid 流程渲染出 SVG 图。

### 用例 2：beautiful SVG 渲染

```md
\`\`\`mermaid engine=beautiful theme=dark
flowchart TD
  A --> B
\`\`\`
```

预期：走 `beautiful-mermaid` 渲染路径，输出 SVG。

### 用例 3：ASCII 输出

```md
\`\`\`mermaid engine=beautiful output=ascii
flowchart LR
  A --> B
\`\`\`
```

预期：输出文本图；`data-export-ready='true'` 在文本生成后置为可导出。

### 用例 4：块级 meta 覆盖

```md
\`\`\`mermaid renderSvg=false showLoading=false
graph TD
  A --> B
\`\`\`
```

预期：该块不渲染图表，仅展示源码；不显示加载态。

### 用例 5：空代码块回退

```md
\`\`\`mermaid
\`\`\`
```

预期：
- `fallbackMode='keep-code'` 时保留原始 `<pre><code>`
- `fallbackMode='placeholder'` 时替换为 `MermaidBlock`

### 用例 6：非法 DSL

```md
\`\`\`mermaid
graph TD
  A ->-> B
\`\`\`
```

预期：进入错误态，或在流式宽限期内展示 pending 文案。

### 用例 7：cacheKey 稳定性

输入同一份代码与同一配置，预期生成相同 `cacheKey`；任一项变更（包括 `engine`、`beautifulOptions`）时，`cacheKey` 应变化。
