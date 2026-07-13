# packages/docs 插件测试标准（AST + UI）

本目录是 `@nnnb/markdown` 插件的**回归与可视化验收**落点。

完整工作流见项目 Skill：

- [`.cursor/skills/components-plugin-ast-ui-test/SKILL.md`](../../../.cursor/skills/components-plugin-ast-ui-test/SKILL.md)
- 规则：[`.cursor/rules/components-plugin-ast-ui-test.mdc`](../../../.cursor/rules/components-plugin-ast-ui-test.mdc)

## 一句话标准

> **解析不抛错不算通过；必须 AST 结构正确，且真实预览 DOM/文案符合预期。**

## 现有套件

| 插件 | 目录 | 页面 | CLI |
| --- | --- | --- | --- |
| remark-think | `remark-think/` | `/test/remark-think` | `pnpm --filter @nnnb/docs test:remark-think` |

## 目录模板

```text
src/test/<plugin-id>/
  types.ts
  cases.ts
  helpers.ts
  uiAssert.ts
  <Plugin>Preview.tsx
  run.ts
  cli.ts
  index.ts
src/pages/<Plugin>Test.vue
```

## 双层结果

| 层 | 含义 | 失败典型原因 |
| --- | --- | --- |
| AST | mdast/转换结构 | 节点缺失、合并错误、文本不对 |
| UI | 挂载后 DOM | 有节点但组件未映射、原始标签泄露、文案缺失 |

综合 PASS = AST ✓ 且 UI ✓。

## 新增插件套件检查清单

1. 建 `src/test/<id>/` 并按模板实现
2. Preview **按用例配置**接线（不要复用 Demo 全开）
3. 测试页：AST/UI 徽章 + 隐藏批跑 DOM 检测
4. 注册路由 `/test/<id>` 与顶栏入口
5. 增加 `package.json` script
6. CLI 与测试页都验证通过后再交付
