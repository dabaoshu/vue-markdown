# Markdown UI 组件统一设计

## 背景

`packages/docs` 与 `packages/simple` 当前各自维护 Markdown 渲染 UI 和编辑器。代码块、Mermaid 等文件存在直接复制，Markdown 入口、Think UI 和编辑器又逐渐分叉。

最初考虑让 simple 直接复用 docs 源码，但这会使 simple 耦合 docs 的目录、别名、组件内部结构和 DOM。最终方案是新增独立的 `packages/markdown-ui`：它基于 `@nnnb/markdown` 提供稳定 UI 组件和优秀案例，docs 与 simple 都作为消费者。

## 目标

- 建立工作区包 `packages/markdown-ui`，包名为 `@nnnb/markdown-ui`。
- 以 docs 当前视觉和行为为迁移基准，迁出 Markdown UI 与编辑器工作台。
- docs 和 simple 不再互相依赖，也不再维护重复实现。
- `@nnnb/markdown` 继续只承载 Markdown 基础能力与扩展能力。
- simple 通过正式扩展接口组合 PDF 预览、PDF 导出和 PNG 导出。
- docs 的现有效果和测试保持不变。

## 非目标

- 不重新设计 docs 的交互和视觉。
- 不把应用层 UI 放入 `packages/components`。
- 不让消费者深路径引用 `markdown-ui/src`。
- 不重构与 Markdown UI 无关的 simple 业务。

## 包定位与依赖

```text
@nnnb/markdown
  Markdown 基础能力与插件扩展
          |
          v
@nnnb/markdown-ui
  |- components: 稳定公共 UI
  `- examples: 可演进的优秀案例
       |                 |
       v                 v
  @nnnb/docs        @nnnb/simple
  文档与展示         业务与导出增强
```

`@nnnb/markdown-ui` 不依赖 docs 或 simple。它只依赖 `@nnnb/markdown`、Vue 以及组件实现必需的 CodeMirror、Element Plus、Mermaid 等库。docs 与 simple 只能通过包入口消费它。

## 包结构

建议结构：

```text
packages/markdown-ui/
  package.json
  tsconfig.json
  src/
    index.ts
    components/
      MarkdownRenderer/
      MarkdownCodeMirror/
      CodeBlock/
      MermaidBlock/
      MermaidCanvasViewport/
      ThinkElement/
    examples/
      index.ts
      MarkdownWorkbench/
        MarkdownWorkbench.vue
        WorkbenchSidebar.vue
        WorkbenchMobileTabs.vue
        WorkbenchFeaturePanel.vue
        streamInputController.ts
        editorActions.ts
    styles/
```

实际迁移时可以根据现有文件规模调整目录，但稳定组件与案例必须分层。

## 公开入口

稳定入口 `@nnnb/markdown-ui` 导出：

- `MarkdownRenderer`
- `MarkdownCodeMirror`
- `CodeBlock`
- `MermaidBlock`
- `MermaidCanvasViewport`
- `ThinkElement`
- 对应 props、feature 配置和扩展类型
- 稳定组件样式入口

案例入口 `@nnnb/markdown-ui/examples` 导出：

- `MarkdownWorkbench`
- 工作台 Tab、内容加载器、功能配置和 expose 类型
- 允许消费者使用的案例配套类型

工作台内部辅助组件不单独承诺稳定，除非确有独立复用需求。

## MarkdownWorkbench 设计

工作台由 docs 当前 `MarkdownDemoEditor` 演化而来，但不得依赖 docs 路由、别名或案例数据。docs 的页面数据通过公开接口注入。

核心输入：

- `v-model:source`：当前 Markdown 内容。
- `v-model:active-tab`：当前案例 Tab。
- `v-model:features`：当前 Markdown 功能配置。
- `tabs`：案例 Tab 元数据。
- `loadTabContent`：异步加载 Tab 内容。
- 默认 feature 配置或 feature resolver。

扩展插槽：

- `toolbar-start`
- `toolbar-end`
- `preview-actions`

公开 expose：

- `previewTarget`：当前预览根元素，只读引用。
- `source`：当前 Markdown 内容，只读引用。
- `reset()`：恢复当前案例内容。
- `stopStream()`：终止流式输入。

只公开消费者确实需要的能力，避免把内部状态全部暴露。

## 消费方式

### Docs

docs 保留：

- 页面和路由。
- Demo Tab 元数据、说明和 Markdown 示例。
- docs 专属内容加载策略。
- 文档站页面布局。

docs 使用 `MarkdownWorkbench` 并注入现有数据。迁移前后页面视觉、Tab、格式化、功能开关、流式输入和预览行为保持一致。

### Simple

simple 的 `/mdeditor` 仍由 simple 路由持有，但页面直接组合 `MarkdownWorkbench`。PDF/PNG 操作通过工作台插槽加入；导出逻辑通过正式的 `previewTarget` 获取预览元素，不查询 CSS 类名，也不依赖内部 DOM。

```text
simple export action
  -> MarkdownWorkbench.previewTarget
  -> @nnnb/markdown capture/export API
  -> PDF preview or file download
```

导出配置、busy 状态、预览弹窗和错误状态继续属于 simple。

## 数据与状态边界

- Markdown 文本、active tab 和 feature 配置通过 v-model 在消费者与工作台之间同步。
- 工作台负责编辑器状态、预览调度和流式输入生命周期。
- docs/simple 分别负责自己的案例数据和业务操作。
- Markdown 渲染由 `MarkdownRenderer` 统一配置，最终调用 `@nnnb/markdown`。
- simple 导出只读取公开的预览目标，不修改工作台内部状态。

## 迁移顺序

1. 创建 `packages/markdown-ui`，配置 workspace、package exports、TypeScript、构建和样式入口。
2. 先迁入 docs/simple 完全重复的代码块和 Mermaid 组件，并让两边从稳定入口消费。
3. 以 docs 行为为基准迁移 MarkdownRenderer、ThinkElement 和 MarkdownCodeMirror。
4. 把 docs 编辑器拆为无应用依赖的 `MarkdownWorkbench`，将 docs 数据改为外部注入。
5. docs 切换到 `MarkdownWorkbench`，完成测试和视觉回归。
6. simple 切换到同一工作台，通过插槽和 expose 接入导出能力。
7. 使用 Graphify 反向依赖和文本搜索确认后，删除两边不再使用的副本与辅助文件。

迁移必须分阶段保持可构建，避免一次移动全部文件后再集中修复。

## 错误处理

- Tab 内容加载失败时显示错误和重试入口。
- 异步加载切换 Tab 时，旧请求结果不得覆盖新 Tab。
- 组件卸载时停止流式输入、预览调度和未完成异步更新。
- `previewTarget` 未就绪时 simple 导出按钮禁用。
- 捕获、分页或下载失败时恢复 busy 状态并显示明确错误。
- 快速重复点击导出时使用 busy 锁防止并发执行。

## 清理规则

清理候选包括 simple 与 docs 中已迁入 `markdown-ui` 的 Markdown UI、编辑器辅助组件和样式。删除前必须同时满足：

1. Graphify 反向依赖没有剩余消费者。
2. `rg` 搜索没有剩余导入。
3. docs、simple 与新包构建均已通过。

仍被其他业务页面使用的文件不得顺带删除。

## 验证策略

自动验证：

- `@nnnb/markdown-ui` 类型检查与生产构建。
- docs 的 Remark Think、GFM、Math、代码高亮和 Mermaid 测试。
- docs 生产构建。
- simple 生产构建。
- 必要的稳定组件 props/emits 和工作台异步状态测试。

集成回归：

- docs 的 Tab、内容加载、格式化、功能开关和流式输入。
- docs 的分栏、仅编辑、仅预览和响应式布局。
- simple `/mdeditor` 加载与编辑预览。
- simple PDF 预览、PDF 导出和 PNG 导出。
- Tab 快速切换、预览未就绪、导出失败等异常路径。

完成代码修改后运行 `graphify update .`，确认重复节点消失、无新增循环依赖，并验证依赖方向为 `markdown -> markdown-ui -> docs/simple`。

## 成功标准

- `packages/markdown-ui` 同时提供稳定 UI 入口和案例入口。
- docs 和 simple 不再互相依赖或深路径引用源码。
- docs 页面行为与迁移前一致。
- simple 的编辑体验与 docs 使用同一工作台实现。
- simple 导出能力不依赖工作台内部 DOM，且没有功能倒退。
- 重复 Markdown UI 与编辑器实现被安全移除。
- 新包、docs 和 simple 的测试与构建全部通过。
