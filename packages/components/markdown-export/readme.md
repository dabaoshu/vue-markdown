# markdown-export

基于 **DOM 截图** 的 Markdown 导出能力，适用于含 Vue/React 自定义组件的业务场景。

## 设计原则

- 导出对象永远是 **已渲染的 DOM 容器**，不是 Markdown 二次解析
- 业务自定义组件 **无需实现导出适配**，预览即导出
- 异步组件通过 `data-export-loading` / `data-export-ready` 协议等待就绪

## 导入边界

- 引擎能力：`@nnnb/markdown` → `exportFromDom`、`previewFromDom`、`waitForDomStable`
- Vue UI：`@nnnb/markdown/vue-ui` → `MarkdownExportHost`、`ExportToolbar`、`ExportPreviewModal`

## 快速使用

```vue
<template>
  <MarkdownExportHost ref="exportHost">
    <VueMarkdown :source="md" :components="components" />
  </MarkdownExportHost>
  <!-- 内置「预览 PDF / 导出 PDF / 导出 PNG」 -->
  <ExportToolbar :host="exportHost" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VueMarkdown, MarkdownExportHost, ExportToolbar } from '@nnnb/markdown/vue-ui';

const exportHost = ref();
</script>
```

### PDF 分页预览

预览与导出共用同一套截图流水线，**所见即所导**：

```vue
<ExportPreviewModal
  :open="previewOpen"
  :pages="preview.pages"
  :pdf-blob="preview.pdfBlob"
  filename="my-doc"
  @close="previewOpen = false"
/>
```

或通过 Host 方法：

```ts
const result = await exportHost.value.previewPdf('my-doc', {
  capture: { width: Math.ceil(target.getBoundingClientRect().width), syncStyles: true }
});
// result.pages — 分页 JPEG 预览图
// result.pdfBlob — 与预览一致的 PDF，弹层内可直接下载
```

引擎层也可直接调用：

```ts
import { previewFromDom } from '@nnnb/markdown';

const preview = await previewFromDom(target, {
  capture: { syncStyles: true },
  pdf: {
    mode: 'paginated',
    pageSize: 'a4',
    orientation: 'portrait',
    marginMm: 10
  }
});

// 仅调整分页时复用 Canvas，无需重新截图
import { buildPdfPreviewFromCanvas, mergePdfOptions } from '@nnnb/markdown';

const nextPreview = await buildPdfPreviewFromCanvas(canvas, mergePdfOptions(preview.pdfOptions, {
  pageSize: 'letter',
  marginMm: 15
}));
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

### `previewFromDom(target, options?)`

生成 PDF 分页预览，不触发下载。返回 `pages`（JPEG data URL）与 `pdfBlob`（可直接下载）。

### `exportFromDom(options)`

| 参数 | 说明 |
| --- | --- |
| `target` | 要截图的 HTMLElement |
| `format` | `pdf` \| `png` \| `jpeg` \| `clipboard` |
| `capture.pixelRatio` | 默认 2 |
| `capture.fullPage` | 默认 true，截取 scrollHeight |
| `capture.syncStyles` | 默认 true，镜像计算样式到 clone |
| `capture.width` | 锁定截图宽度，建议传预览区可视宽度 |
| `pdf.pageSize` | 默认 a4，可选 letter / custom |
| `pdf.mode` | 默认 paginated，可选 single（单页长图） |
| `pdf.orientation` | 默认 portrait |
| `pdf.marginMm` | 统一页边距（毫米），默认 10 |
| `pdf.margins` | 分项页边距，优先级高于 marginMm |
| `pdf.customPageSize` | custom 模式下的 `{ widthMm, heightMm }` |
| `pdf.smartBreak` | 默认 true，沿 DOM 块边界分页，避免切断文字/图表 |
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
