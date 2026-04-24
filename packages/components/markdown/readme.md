# markdown 模块说明

`markdown` 模块参考 `react-markdown` 的处理链路实现，绝大部分参数语义与其保持一致，并在 Vue 场景做了运行时适配。

## 目录分层

当前目录已按 engine-only 规则整理为：

- `core/`：纯类型与纯函数（如 URL 安全转换、语法树 source 挂载插件）
- `engine/`：解析与渲染编排（`CreateVMarkdown`、HAST 后处理等核心流程）
- `vue-markdown.tsx`：Vue 组件实现
- `vue-ui.ts`：Vue UI 专用导出入口
- `index.tsx`：默认引擎入口（不导出 UI）
- `markdown.ts`：历史入口兼容层（转发到 `engine`）

## 导入边界

- 引擎能力：从 `@nnnb/markdown` 导入
- Vue UI 组件：从 `@nnnb/markdown/vue-ui` 导入

## 兼容说明

- 历史导出名 `CreateVMarkdown` 仍可继续使用
- `MarkdownOptions` 与 `defaultUrlTransform` 仍保持对外可用
