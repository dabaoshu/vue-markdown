# markdown-export

基于 **DOM 截图** 的 Markdown 导出能力，适用于含 Vue/React 自定义组件的业务场景。

## 设计原则

- 导出对象永远是 **已渲染的 DOM 容器**，不是 Markdown 二次解析
- 业务自定义组件 **无需实现导出适配**，预览即导出
- 异步组件通过 `data-export-loading` / `data-export-ready` 协议等待就绪

## 导入边界

- 引擎能力：`@nnnb/markdown` → `exportFromDom`、`waitForDomStable`
- Vue UI：`@nnnb/markdown/vue-ui` → `MarkdownExportHost`、`ExportToolbar`

## 快速使用

```vue
<template>
  <MarkdownExportHost ref="exportHost">
    <VueMarkdown :source="md" :components="components" />
  </MarkdownExportHost>
  <ExportToolbar :host="exportHost" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VueMarkdown, MarkdownExportHost, ExportToolbar } from '@nnnb/markdown/vue-ui';

const exportHost = ref();
</script>
```

## 自定义组件就绪协议

| 属性 | 含义 |
| --- | --- |
| `data-export-loading` | 存在则阻塞截图 |
| `data-export-ready="true"` | 显式标记就绪 |
| `data-export-ignore` | 截图时隐藏 |
| `data-export-expand` | 截图时强制展开 |

## 对等依赖

```bash
pnpm add html2canvas jspdf
```

## API

### `exportFromDom(options)`

| 参数 | 说明 |
| --- | --- |
| `target` | 要截图的 HTMLElement |
| `format` | `pdf` \| `png` \| `jpeg` \| `clipboard` |
| `capture.pixelRatio` | 默认 2 |
| `capture.fullPage` | 默认 true，截取 scrollHeight |
| `capture.syncStyles` | 默认 true，镜像计算样式到 clone |
| `capture.width` | 锁定截图宽度，建议传预览区可视宽度 |
| `pdf.pageSize` | 默认 a4 |
| `timeoutMs` | 默认 15000 |

更多阶段规划见 [ROADMAP.md](./ROADMAP.md)。

## 样式一致性说明

截图导出与预览不一致时，通常由以下原因导致，引擎已内置对应处理：

1. **宽度重排**：截图前锁定容器 `width`，避免 html2canvas 重新排版
2. **父级滚动容器**：临时将祖先 `overflow/max-height` 设为可见
3. **clone 样式丢失**：默认 `syncStyles: true`，镜像 font/background/border/flex 等计算样式
4. **工具栏干扰**：交互按钮加 `data-export-ignore`，截图时自动隐藏
5. **异步遮罩**：Mermaid loading 遮罩在导出时隐藏

业务侧建议：

- 预览与导出共用同一 DOM 容器（`MarkdownExportHost`）
- 异步组件使用 `data-export-loading` / `data-export-ready`
- 导出时传入 `capture.width: target.getBoundingClientRect().width`
