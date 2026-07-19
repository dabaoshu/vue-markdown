# Docs/Simple 组件统一设计

## 背景

`packages/docs` 与 `packages/simple` 当前各自维护 Markdown 渲染组件和编辑器实现。代码块、Mermaid 等文件已出现直接复制，Markdown 入口、Think UI 和编辑器又逐渐分叉，导致修复和样式优化需要同步多份代码。

本次统一以 docs 的现有实现为基准。docs 已经确定的业务组件应保持稳定；simple 直接复用 docs 源码，并在外层保留 PDF、PNG 等 simple 专属的新特性。`packages/components` 继续只承载 Markdown 基础能力和扩展能力，不接收应用层 UI。

## 目标

- docs 成为 Markdown UI 和编辑器的唯一实现源。
- simple 的 `/mdeditor` 完全使用 docs 编辑器，不再维护第二套编辑体验。
- docs 的现有业务组件不因本次统一而修改。
- simple 继续提供 PDF 预览、PDF 导出和 PNG 导出。
- 删除 simple 中不再使用的 Markdown UI、编辑器工具和示例数据副本。
- docs 与 simple 都能独立完成生产构建，docs 现有测试保持通过。

## 非目标

- 不把应用层 UI 下沉到 `packages/components`。
- 不重新设计 docs 编辑器的交互、布局或视觉样式。
- 不为 `@nnnb/docs` 建立正式发布包或稳定的公共 API。
- 不重构与 Markdown 编辑器无关的 simple 业务模块。

## 依赖边界

最终依赖方向为：

```text
packages/components <- packages/docs UI <- packages/simple wrapper
                                              `- simple export enhancements
```

`packages/docs/src/demo/MarkdownDemoEditor.vue` 及其相对路径依赖保持原样，作为基准编辑器。simple 通过源码别名引用 docs，不使用跨目录的多层相对路径。

simple 的 Vite 配置增加 `@docs` 别名，指向 `packages/docs/src`。因为 docs 编辑器内部动态导入 `@/components/markdown`，simple 还需在通用 `@` 别名之前增加这一条精确映射，使该导入在 simple 构建中仍指向 docs 组件。simple 自己已有的 `@` 别名继续指向 `packages/simple/src`。

若 TypeScript 配置需要识别跨包源码，则增加与 Vite 一致的路径映射或包含范围。配置只服务开发和构建解析，不改变 docs 源文件。

## 组件设计

simple 保留 `src/mdeditor/MarkdownEditor.vue` 作为组合包装器，路由无需改变。包装器结构如下：

```text
simple MarkdownEditor
|- simple export toolbar
|- docs MarkdownDemoEditor
`- simple export preview modal
```

包装器负责：

- 维护 active tab，并通过 `v-model:active-tab` 传给 docs 编辑器。
- 提供 PDF 预览、PDF 导出和 PNG 导出操作。
- 维护导出忙碌状态、PDF 配置、预览页、Blob 和错误状态。
- 定位当前 docs 预览 DOM，并调用 `@nnnb/markdown` 的导出能力。
- 在预览不可用时禁用导出或显示明确错误。

docs 编辑器继续负责：

- Tab 和示例内容加载。
- CodeMirror 编辑体验及格式化快捷操作。
- 功能开关。
- 流式输入模拟。
- Markdown 实时预览和响应式布局。

## 导出数据流

docs 编辑器当前不暴露 Markdown 内容或预览元素。为保持 docs 源码不变，simple 包装器通过自己的容器引用定位 `.preview-content`：

```text
user export action
  -> locate wrapper element
  -> query .preview-content
  -> validate visible/mounted preview
  -> capture/export API from @nnnb/markdown
  -> preview modal or file download
```

PDF 预览沿用现有的画布捕获和分页流程，包括 `captureTargetCanvas`、`buildPdfPreviewFromCanvas` 与 PDF 配置合并。实际导出使用现有 DOM 导出能力完成 PDF 或 PNG 下载。

该方案有意接受 simple 对 docs `.preview-content` 类名的耦合。若 docs 后续重命名该类，simple 构建可能仍通过，但导出集成测试应立即暴露失败。未来如需消除该耦合，可另行设计 docs 的稳定 expose 接口；不纳入本次范围。

## 清理范围

在逐项确认无其他调用后，删除 simple 中已由 docs 接管的副本：

- `src/components/markdown/` 下的 Markdown UI 组合组件和样式。
- `src/mdeditor/DemoTabsPanel.vue`。
- `src/mdeditor/demoData.ts`。
- `src/mdeditor/editorActions.ts`。
- `src/mdeditor/editorHelper.ts`。
- 仅供旧编辑器使用的 Mermaid 示例数据。
- `useStreamPlayback` 等仅供旧编辑器使用的 hook。

任何仍被 simple 其他路由或业务组件引用的文件不得删除。清理前使用 Graphify 反向依赖查询和文本搜索双重确认。

## 错误处理

- 找不到 `.preview-content` 时不调用捕获函数，并给用户明确提示。
- 预览处于未挂载、加载中或仅编辑模式时，导出按钮不可用。
- 捕获、分页或下载失败时恢复 busy 状态，并通过现有消息机制显示错误。
- 快速重复点击导出时复用 busy 锁，避免并发生成多个画布或下载。
- 组件卸载后不得继续更新预览或导出状态。

## 验证策略

自动验证包括：

- 运行 docs 已有的 Remark Think、GFM、Math、代码高亮和 Mermaid 测试。
- 运行 docs 生产构建。
- 运行 simple 生产构建。
- 验证 TypeScript/Vite 能正确解析 docs 跨包源码及其动态导入。

集成验证覆盖：

- simple `/mdeditor` 能加载 docs 编辑器。
- Tab 切换、示例加载、格式化、功能开关和流式输入正常。
- 分栏、仅编辑和仅预览模式正常。
- PDF 预览、PDF 导出和 PNG 导出正常。
- 预览未挂载时不会抛出未处理异常。

完成代码修改后运行 `graphify update .`，确认 simple 重复组件节点消失、跨包依赖符合设计且没有新增循环依赖。

## 成功标准

- docs 业务组件没有源码改动。
- simple 不再维护 Markdown UI 和完整编辑器副本。
- simple `/mdeditor` 的核心编辑体验与 docs 一致。
- simple 原有导出能力没有功能倒退。
- docs 测试、docs 构建和 simple 构建全部通过。
