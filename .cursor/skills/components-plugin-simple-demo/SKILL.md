---
name: components-plugin-simple-demo
description: 在 packages/components 新增或测试 markdown 插件时，同步在 packages/simple 提供可运行用例与预览；适用于 remark/rehype 扩展、@nnnb/markdown 引擎调试、VueMarkdown 组合验证，或用户要求本地演示插件效果。
---

# Components 插件与 simple 演示用例

## 与引擎规则的关系

`packages/components` 内的分层、导出边界与框架接入门禁以仓库规则为准：

- 详见 [components-engine-only.mdc](../../rules/components-engine-only.mdc)

本 skill 补充一条**项目内交付习惯**：凡在 `packages/components` **新增或改动可对外暴露的插件/管线能力**，或需要**人工在浏览器里验证**时，必须在 `packages/simple` 留下对应用例（见下文工作流），除非用户明确声明本次不必加演示。

## 何时必须动 `packages/simple`

在以下情况**默认**要加或更新 simple 用例：

- 新增 remark/rehype 插件、自定义语法、或新的 `core/` / `engine/` 导出能力。
- 修改现有插件行为，需要对比渲染结果。
- 用户说「测一下插件」「加个 demo」「在 simple 里试一下」。

以下可**省略** simple 用例（在回复里说明原因即可）：

- 仅内部重构、无对外 API 与渲染语义变化。
- 用户明确只要单元测试、不要演示页。

## `packages/simple` 用例落点（按现有结构）

优先复用 **Markdown 编辑器 + 右侧预览** 这一条链路（与线上组合一致）：

| 目的 | 典型文件 |
| --- | --- |
| 示例 Markdown、Tab 分类 | `packages/simple/src/mdeditor/demoData.ts` |
| 预览侧插件 / 组件映射 | `packages/simple/src/components/markdown/index.tsx`（`VueMarkdown` 的 `remarkPlugins`、`rehypePlugins`、`components` 等） |
| 编辑页布局与 Tab 状态 | `packages/simple/src/mdeditor/MarkdownEditor.vue` |
| Tab UI（若启用） | `packages/simple/src/mdeditor/DemoTabsPanel.vue` |

### 新增一个「插件演示」Tab 的检查清单

1. **`demoData.ts`**
   - 扩展 `DemoTabId` 联合类型。
   - 在 `DEMO_TAB_CONFIG` 中增加 `label` 与能**覆盖插件边界**的 `markdown`（最小复现 + 一两个正常样例）。
   - 将新 id 插入 `DEMO_TAB_ORDER`（决定 Tab 顺序）。
2. **`MarkdownEditor.vue`**
   - 若使用 Tab：`activeDemoTab` 初始值、`watch`、`resetDemoForActiveTab` 已与 `DEMO_MARKDOWN` 联动，一般只需保证新 Tab 在 `DEMO_MARKDOWN` 中有键。
   - 若 `DemoTabsPanel` 被注释，新增 Tab 后应**取消注释**或改用等价方式让用户能切换到新示例（以用户能一键看到为准）。
3. **`components/markdown/index.tsx`**
   - 将新插件接到与业务一致的 `VueMarkdown` 配置上（仅 simple 侧封装，**不**在 `packages/components` 默认入口混导 UI，规则见上引 mdc）。
4. **注释**：新增导出函数、复杂配置对象处使用 **JSDoc**（输入/输出/边界），与仓库惯例一致。

## 与「框架接入门禁」的配合

- 引擎与类型留在 `packages/components`；**浏览器可点验证**放在 `packages/simple`。
- 若实现涉及修改全局路由、应用根实例、或把引擎绑死到 Vue 生命周期，仍须先列出方案并**征得用户确认**后再改（见 mdc「框架接入门禁」）。

## 验证方式

在 monorepo 根目录对 `packages/simple` 执行开发启动（以项目 README 或 `package.json` 脚本为准），打开 Markdown 演示路由，切换对应 Tab，确认源码与预览均符合预期。

## 与 AST + UI 测试标准的关系

业务向 demo（本 skill）之外，**断言向回归**请遵循：

- [components-plugin-ast-ui-test](../components-plugin-ast-ui-test/SKILL.md)

当用户要求「测试用例 / 测试页 / 不报错但预览不对」时，优先在 `packages/docs/src/test/<plugin>/` 落 AST + UI 双层验收，而不是只加 simple Tab。
