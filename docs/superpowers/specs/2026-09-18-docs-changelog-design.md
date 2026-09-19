# Docs 版本更新日志设计

日期：2026-09-18  
状态：已确认；实现计划见 `docs/superpowers/plans/2026-09-18-docs-changelog.md`

## 背景

`@nnnb/markdown` 已发到 **1.0.5**（git tag `v1.0.5`，日期 2026-09-08），仓库没有 `CHANGELOG.md`，文档站顶栏也没有发布说明入口。对外访客只能从 GitHub commit / npm 版本号猜改了什么。

文档站刚做的业务场景、流式对话等改动只存在于 `packages/docs`，**不是**包版本的一部分。

## 目标

1. 仓库根目录新增一份 Keep a Changelog 格式的 `CHANGELOG.md`，作为 GitHub 与文档站的**唯一源**。
2. 文档站新增 `/changelog` 页，直接渲染这份文件，不另存副本。
3. 顶栏在「业务场景」和「GFM」之间增加「更新日志」。
4. 从当前已发布的 **1.0.5** 起记；更早版本用一句话带过。
5. 用 `[Unreleased]` 承接下一版包改动；发版时再挪进新版本号。现在没有未发布的包改动时，标题下写「暂无尚未发布的包改动。」

## 非目标

- 不按 git 历史补全 1.0.4 及更早版本的分条日志。
- 不给 `@nnnb/markdown-ui`、`@nnnb/docs`、`@nnnb/simple` 各写一份 changelog。
- **文档站 / simple 改动不进 `CHANGELOG.md`**（含业务场景、流式对话、测试页）。
- 不把 changelog 复制进 npm 包（不改 `packages/components` 的 `files` / 发布脚本）。
- 不在首页加入口卡或 Hero 按钮。
- 不改 `/demo`、`/scenes`、`packages/simple`、`@nnnb/markdown` 引擎 API、`@nnnb/markdown-ui` 工作台 API。
- 不做版本时间轴组件、筛选、RSS、对比链接页脚。
- 不新建 `/test/*` 可视化验收页。
- 不自动从 git tag 生成条目，不接 CI 发版机器人。

## 站点信息架构

文档站四条线互不混用：

| 入口 | 路由 | 受众 | 内容 |
| --- | --- | --- | --- |
| 功能特点 | `/`、`/demo` | 核对插件与语法 | 现有 |
| 业务场景 | `/scenes` | 看真实文档长什么样 | 现有 |
| **更新日志** | **新建** `/changelog` | 看包发了什么 | 根目录 `CHANGELOG.md` |
| 回归测试 | `/test/*` | 开发 | 不动 |

### 顶栏

在 `packages/docs/src/App.vue` 中，「业务场景」`RouterLink` 之后、「GFM」之前插入：

- 文案：**更新日志**
- `to="/changelog"`
- `active-class="is-active"`，样式与现有 `docs-nav-link` 相同

不新增折叠菜单。GitHub 外链保持原样。

### 布局宽度

`/changelog` **不**加入 `isWidePage`。沿用默认 `docs-main`（`max-width: 1200px`），与首页同宽，与 `/demo`、`/scenes`、`/test/*` 的宽版区分开。

### 首页

不改 Hero、业务场景卡、核心能力卡。只靠顶栏进入。

## 唯一源：`CHANGELOG.md`

路径：仓库根目录 `CHANGELOG.md`（与 `package.json` 同级）。

格式约定（Keep a Changelog，中文正文）：

- 文件一级标题：`# Changelog`
- 一段说明：本文件只记录公开发布的 `@nnnb/markdown`；文档站改动不记。
- 区块顺序固定：`## [Unreleased]` → `## [1.0.5] - 2026-09-08` → `## 更早版本`
- 版本标题必须同时包含方括号版本号和 ISO 日期 `YYYY-MM-DD`（Unreleased 无日期）。
- 版本内分类只用需要的：`### Added` / `### Changed` / `### Fixed` / `### Removed`。没有的分类整节省略。
- Unreleased 在没有任何条目时**不**留空分类标题，只写一句：`暂无尚未发布的包改动。`

首版正文固定为：

```markdown
# Changelog

本文件记录公开发布的 `@nnnb/markdown`。文档站（`packages/docs`）与 playground（`packages/simple`）的改动不记在这里。

## [Unreleased]

暂无尚未发布的包改动。

## [1.0.5] - 2026-09-08

### Changed

- 对齐 v1.0.4 的发布入口，并固定本次 Demo / Mermaid 相关版本。

### Added

- Mermaid 预览导出改为从已渲染 SVG 栅格化 PNG，不再用 html2canvas 截预览容器。

## 更早版本

1.0.4 及更早版本未公开完整日志。
```

实现时按上面原文落地，不改写口径。

## 文档站渲染

### Vite 别名

`packages/docs/vite.config.ts` 增加指向仓库根的别名 `@repo`：

```ts
'@repo': path.resolve(__dirname, '../..')
```

页面只允许这一处读取 changelog：

```ts
import changelogMarkdown from '@repo/CHANGELOG.md?raw';
```

禁止在 `src/` 下再复制一份 md。相对路径 `../../../../CHANGELOG.md` 不准用。

`?raw` 是构建期静态导入：文件缺失则 **dev/build 失败**，这是预期，不需要运行时 fetch。

### 页面

新建 `packages/docs/src/pages/Changelog.vue`：

- 页头：`h1`「更新日志」；副文「记录 `@nnnb/markdown` 的公开发布。」
- 正文：`<MarkdownRenderer :source="changelogMarkdown" :features="features" />`
- `features` **必须显式关掉**默认全开的能力，只保留排版：

```ts
{
  gfm: true,
  breaks: true,
  math: false,
  mermaid: false,
  think: false,
  codeHighlight: false,
  customTags: false,
  elTable: false,
  httpResource: false
}
```

不传 `components`。不用 `MarkdownWorkbench`。

### 空内容兜底

若 `changelogMarkdown` 去掉首尾空白后长度为 0，不渲染 `MarkdownRenderer`，改为一段可见错误：「无法加载更新日志。」不使用空白页、不 toast。

（构建期缺文件会直接失败，本兜底只覆盖空字符串。）

### 路由

`packages/docs/src/router/index.ts` 增加：

```ts
{
  path: '/changelog',
  name: 'Changelog',
  component: () => import('@/pages/Changelog.vue')
}
```

放在 `/scenes` 之后、`/test/*` 之前。catch-all 仍重定向首页，不改。

## 数据流

```
CHANGELOG.md  ──Vite ?raw──►  Changelog.vue  ──MarkdownRenderer──►  /changelog
     ▲
     └── GitHub 直接展示同一文件
```

没有第二份数据源，没有生成脚本。

## 发版维护（人工）

下一版 `@nnnb/markdown` 发布时（例如 1.0.6）：

1. 把 `[Unreleased]` 下的条目剪到新的 `## [1.0.6] - YYYY-MM-DD`（今天的日期）。
2. `[Unreleased]` 恢复为「暂无尚未发布的包改动。」
3. 新区块插在 Unreleased **之下**、旧版本 **之上**（倒序）。
4. 包版本号仍只改 `packages/components/package.json`；本任务不接自动 bump。

未发布过程中，有包 API / 行为改动才写入 Unreleased。docs-only 禁止写入。

## 测试

新建 `packages/docs/src/changelog/cli.ts`，`packages/docs/package.json` 增加 `"test:changelog": "esno src/changelog/cli.ts"`。

用 `fs` 读仓库根 `CHANGELOG.md`（从 `packages/docs` 解析 `../.. /CHANGELOG.md`），断言：

1. 文件非空。
2. 含 `## [Unreleased]`。
3. 含 `## [1.0.5] - 2026-09-08`。
4. 含「文档站」且说明不记 docs 改动（匹配「文档站」与「不记」）。
5. 含「更早版本」与「1.0.4」。
6. `packages/docs/src/App.vue` 含 `to="/changelog"` 与「更新日志」。
7. `packages/docs/src/router/index.ts` 含 `path: '/changelog'`。
8. `packages/docs/src/pages/Changelog.vue` 含 `@repo/CHANGELOG.md?raw`，且 `mermaid: false`。

失败 `console.error` + `process.exit(1)`，风格对齐 `src/scenes/cli.ts`。不写 AST+UI 浏览器套件。

手动验收：`pnpm --filter @nnnb/docs test:changelog`；浏览器打开 `/changelog` 能看到 1.0.5 两条，顶栏当前项高亮。

## 错误处理

| 情况 | 行为 |
| --- | --- |
| 根目录没有 `CHANGELOG.md` | Vite 解析失败，dev/build 报错 |
| 文件存在但是空 | 页面显示「无法加载更新日志。」 |
| Markdown 语法一般错误 | `MarkdownRenderer` 按 GFM 尽力渲染，不加自定义错误边界 |

## 范围边界

| 做 | 不做 |
| --- | --- |
| 根 `CHANGELOG.md` | 包内第二份 changelog |
| `/changelog` + 顶栏 | 首页入口、时间轴 UI |
| docs CLI 断言 | `/test/changelog` 页 |
| 显式关闭 mermaid 等 | 默认 `DEFAULT_MARKDOWN_FEATURES` |

## 实现顺序（供计划拆任务）

1. 落地根目录 `CHANGELOG.md` 首版正文。
2. Vite `@repo` 别名、路由、`Changelog.vue`、顶栏。
3. CLI 测试。
4. 浏览器打开 `/changelog` 核对渲染与导航高亮。
