# Mermaid v1.0.4 离线导出兼容层

适用于继续使用 `@nnnb/markdown@1.0.4`，且 Mermaid 卡片通过 `html2canvas(root, options)` 下载或复制 PNG 的项目。实现移植自本仓库 v1.0.5 的 `remark-mermaid/adapters/svgExport.ts`，无需安装依赖或访问外网。

本补丁替换的是**导出链路**：已渲染 SVG → Image → Canvas → PNG。它不会优化 Mermaid 语法解析、布局计算或流式预览渲染；若生成预览时已经卡顿，需要单独处理。

## 接入：替换 Mermaid 卡片的一处导入

1. 将本目录的 `index.ts` 和 `svgExport.ts` 一起复制到现场项目 `src/compat/mermaid-v1.0.4/`。
2. 在使用 html2canvas 的 Mermaid 卡片源码中替换导入（本仓库旧源码位置为 `packages/markdown-ui/src/components/mermaid/code_mermaid_card.tsx`）：

```ts
// 原来
import html2canvas from 'html2canvas';

// 改为本地兼容层；路径按现场项目目录调整
import html2canvas from '@/compat/mermaid-v1.0.4';
```

原来的调用、Canvas 转 Blob、下载和剪贴板逻辑可以保留：

```ts
const root = previewPaneRef.value?.getRootElement();
if (!root) return;
const canvas = await html2canvas(root, {
  backgroundColor: '#ffffff',
  scale: Math.max(window.devicePixelRatio || 1, 2),
  useCORS: true,
  allowTaint: false,
  logging: false
});
```

无需使用 v1.0.5 才有的 `getSvgElement()`，兼容层会在旧预览容器内查找 SVG。依赖版本和锁文件保持原样，使用现场已有工具重新构建业务项目即可。

如果卡片完全封装在已编译的依赖中，且现场没有它的可编辑源码，单独复制兼容层不会自动替换内部实现。需要在该依赖的实际调用位置打离线补丁，或使用它提供的组件替换入口；先确认现场包的构建结构再接入。**不要配置全局 html2canvas alias**，否则整页截图、PDF 导出等功能也会被替换。

## 行为与边界

- 返回 `Promise<HTMLCanvasElement>`，兼容旧下载和复制调用；未渲染出 SVG 时明确报错，不回退到 html2canvas。
- 默认白底、两倍像素，画布最长边限制为 4096，超大图会降低输出分辨率。
- 导出完整图表，不包含工具栏、容器背景和缩放后的视口裁剪。
- 沿用 v1.0.5 的 foreignObject 文本回退：保留纯文本，但多行、富文本及其排版可能简化。需要原始保真时可使用 `svgExport.ts` 中的 `downloadSvgFallback` 下载 SVG。
- `useCORS`、`allowTaint: false` 和 `logging` 只为旧调用保留，不提供通用 html2canvas 的截图选项或外链图片代理功能。
- 图片复制仍受现场浏览器和剪贴板权限限制；非安全上下文的内网 HTTP 页面可能无法复制，PNG 下载可独立使用。
- `svgExport.ts` 的复制辅助方法修复了异步剪贴板写入失败后 Promise 不结束的问题；只替换旧 html2canvas 导入时仍使用现场原来的复制逻辑。

## 验证

本仓库运行：

```sh
node --test compat/mermaid-v1.0.4/compat.test.mjs
node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2020 --module ESNext --moduleResolution node --lib ES2020,DOM compat/mermaid-v1.0.4/index.ts compat/mermaid-v1.0.4/svgExport.ts
```

现场接入后用中文流程图、时序图、长图分别检查 PNG 下载和图片复制，并检查缩放后导出是否仍为完整图。上述自动测试验证调用契约和错误传播，不代替目标浏览器中的图片效果和性能验收。

回退时将 Mermaid 卡片的导入恢复为 `html2canvas` 即可。
