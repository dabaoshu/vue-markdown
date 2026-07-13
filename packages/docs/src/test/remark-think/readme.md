# remark-think 测试套件

本目录是 **AST + UI 双层测试标准** 的参考实现。

总标准见：

- [../readme.md](../readme.md)
- [`.cursor/skills/components-plugin-ast-ui-test/SKILL.md`](../../../../../.cursor/skills/components-plugin-ast-ui-test/SKILL.md)

## 目录

| 文件 | 作用 |
| --- | --- |
| `types.ts` | 用例与断言类型 |
| `cases.ts` | 完整用例数据 |
| `helpers.ts` | 解析、遍历、AST 断言 |
| `uiAssert.ts` | 默认 UI 期望 + DOM 断言 |
| `RemarkThinkPreview.tsx` | 按用例 `tags` / `merge` 精确接线 |
| `run.ts` / `cli.ts` | CLI（AST） |
| `index.ts` | 聚合导出 |

## 用例分组

| group | 覆盖点 |
| --- | --- |
| `block` | 换行块级 / opening 同行空格 / 单行紧凑 / 多行正文 / 空内容 / 内容含 `<` |
| `inline` | 段落行内、带空格、中文上下文、多实例、紧凑与空格混用 |
| `merge` | 连续块合并、标题打断、紧凑+经典相邻、same-line 参与合并 |
| `multi-tag` | `custom` / `other`、多标签同文档、未配置标签不误识别 |
| `mixed` | 标题混排综合样例、段落后块级、代码围栏内不解析 |
| `edge` | 未闭合、孤立 closing、普通尖括号、流式前缀、空文档、空白包裹 |

## 可视化页面

[http://localhost:8002/test/remark-think](http://localhost:8002/test/remark-think)

- 侧栏 **AST / UI** 两层结果
- UI：挂载 `RemarkThinkPreview` 后检查 class、文本、是否泄露原始 `<tag>`

## 运行 CLI

```bash
pnpm --filter @nnnb/docs test:remark-think
pnpm --filter @nnnb/docs test:remark-think -- --group=inline
```

## 追加用例

在 `cases.ts` 追加一项即可：

1. `id` 使用 `group-场景`（如 `block-compact-single-line`）
2. `description` 写清边界意图
3. `markdown` 用 `thinkTags()` 拼标签
4. `expect` / `expect.ui` 只声明需要检查的字段

### AST 断言字段

- `rootChildTypes` / `thinkFlowCount` / `thinkGroupCount` / `firstThinkGroupSize`
- `inlineTagName` / `contentIncludes` / `contentExcludes`
- `noThinkNodes` / `noThrow`（默认 true）
