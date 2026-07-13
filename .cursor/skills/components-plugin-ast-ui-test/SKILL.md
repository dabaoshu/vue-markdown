---
name: components-plugin-ast-ui-test
description: >-
  为 packages/components 的 markdown 插件建立 AST+UI 双层测试与 docs 可视化验收页。
  在新增/改动 remark、rehype、自定义语法、或用户提到测试用例、测试页、AST/UI 断言、
  不报错但预览不对、packages/docs/src/test 时使用。参考实现：remark-think。
---

# Components 插件 AST + UI 测试标准

## 核心原则（必须遵守）

1. **不报错 ≠ 通过**。解析成功、CLI 全绿，仍可能预览 DOM/文案不符合预期。
2. **必须双层验收**：
   - **AST**：mdast / 转换结果结构断言
   - **UI**：真实挂载预览后检查 DOM（选择器、可见文本、是否泄露原始标签）
3. **可视化页是交付物**：用例不仅跑 CLI，还要在 `packages/docs` 提供可点选对照页。
4. 与 [components-plugin-simple-demo](../components-plugin-simple-demo/SKILL.md) 互补：
   - simple：业务向 demo / 编辑预览
   - docs/test：断言向回归与 UI 验收

参考实现：`packages/docs/src/test/remark-think/` + 路由 `/test/remark-think`。

## 何时必须落地本标准

默认要做（除非用户明确只要引擎、不要测试页）：

- 新增或改动 remark/rehype 插件、自定义语法解析
- 改了节点 → 组件映射（如 `hName`、自定义 mdast type）
- 用户说「测一下」「写测试用例」「预览不对但不报错」

可省略：

- 纯注释/文档改动
- 与渲染语义无关的内部重构（回复里说明原因）

## 标准目录（每个插件一套）

```text
packages/docs/src/test/<plugin-id>/
  types.ts              # Case / Expect / UiExpect 类型
  cases.ts              # 数据驱动用例
  helpers.ts            # parse + AST assert + evaluate（不抛给页面）
  uiAssert.ts           # 默认 UI 期望推导 + DOM assert
  <Plugin>Preview.tsx   # 按用例配置精确接线的预览（勿绑 Demo 默认全开特性）
  run.ts / cli.ts       # CLI（可只跑 AST）
  index.ts              # 导出
packages/docs/src/pages/<Plugin>Test.vue   # 可视化页
```

路由约定：`/test/<plugin-id>`；顶栏增加对应入口。

`package.json` 脚本约定：

```json
"test:<plugin-id>": "esno src/test/<plugin-id>/cli.ts"
```

## 用例数据约定

每条用例至少包含：

| 字段 | 要求 |
| --- | --- |
| `id` | `group-场景`，稳定可引用 |
| `group` | 便于筛选：`block` / `inline` / `merge` / `edge` 等 |
| `title` / `description` | 写清边界意图 |
| `markdown` | 输入；标签名用助手函数拼接，避免硬编码被工具改写 |
| `tags` / 插件选项 | 与真实配置一致 |
| `expect` | AST 断言；可选 `expect.ui` 覆盖默认 UI 期望 |

**正向成功用例**默认 UI 应包含：

- 对应组件根 class 存在（如 `.markdown-think`）
- 关键案文本出现在预览可见文本中
- **不得**再露出原始开闭标签字符串（如 `<think>` / `</think>`）

**负向用例**默认 UI 应断言：相关组件 class **不存在**。

## 可视化页约定

1. 侧栏：分组筛选 + 每条显示 **AST / UI** 两枚徽章
2. 右侧：输入 Markdown、实时预览、生效 UI 期望、mdast JSON、`expect`
3. 隐藏批跑容器：对全部用例真实挂载 Preview，再 `querySelector` 做 UI 断言
4. 综合 PASS = `parseOk && uiOk`
5. Preview **必须按本用例配置渲染**（tags / merge / plugins），禁止无 Demo「全特性默认」掩盖差异

## 实现检查清单

新增或扩展某插件测试时，按序完成：

1. [ ] `types.ts`：AST expect + UI expect
2. [ ] `cases.ts`：覆盖正常 / 边界 / 负向 / 混排（至少各 1）
3. [ ] `helpers.ts`：parse、AST assert、`evaluate*`（返回结构体，供页面）
4. [ ] `uiAssert.ts`：`buildDefaultUiExpectation` + `assert*Ui(dom, case)`
5. [ ] `*Preview.tsx`：精确接线，JSDoc 说明输入配置
6. [ ] `*Test.vue`：双层徽章 + 批跑 DOM 检测
7. [ ] 路由 + 顶栏入口
8. [ ] `package.json` CLI 脚本
9. [ ] 本地验证：CLI 全绿 **且** 测试页 AST/UI 均为通过

## 常见坑（来自 remark-think）

- mdast 自定义节点若只用 `type: 'element'`，AST 可能“有节点”，但 remark-rehype 映不到组件 → **必须查 UI**
- 行内/块级成功渲染应走 `data.hName`（或等价 hast 映射），并与 `components` 的 key 对齐
- Demo 默认 `MergeThinkRemark` 常开；测试 Preview 要以用例 `merge` 为准
- CLI 只能稳定跑 AST；**UI 断言以浏览器测试页为准**

## 与引擎规则的关系

引擎分层与导出边界仍遵守 [components-engine-only.mdc](../../rules/components-engine-only.mdc)：

- 引擎与类型在 `packages/components`
- 测试页、预览封装在 `packages/docs`
- 不要为了测试把 UI 混进组件包默认入口
