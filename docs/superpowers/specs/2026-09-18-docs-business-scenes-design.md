# Docs 业务场景演示设计

日期：2026-09-18  
状态：已确认；实现计划见 `docs/superpowers/plans/2026-09-18-docs-business-scenes.md`

## 背景

官网在线 Demo（`packages/docs` 的 `/demo`）按**功能特点**组织：GFM、公式、代码高亮、Mermaid、表格、HTTP 资源、Think、表单。文案是插件说明书和语法边界，适合接入方核对能力，不像真实业务文档。

`packages/simple` 是本地技术 playground，与官网 Demo 曾长期同步 Tab 数据。本次明确：**以后 simple 不再同步官网内容**。

## 目标

在文档站新增一套**成品向、可交互**的业务场景演示，让对外访客看到 Markdown 接进真实文档后的样子，并能做几件真实产品里会做的事。

1. 与功能 Demo 完全分开：独立路由、独立数据、独立导航入口。
2. 三条业务线各一篇主故事：AI 助手、企业知识库、研发协作。
3. 四个短场景补足主故事里不够突出的观感：思考过程、工单附件、报障表、容量公式。
4. 页面不是工作台：不能改源码、不能拨插件开关。
5. 场景内具备产品级演示交互：助手可再问、附件可预览、报障表可填可提交（仅本地状态）。

## 非目标

- 不改 `packages/simple` 的 Tab、文案、路由或渲染封装。
- 不往 `packages/docs/src/demo/demoData.ts` 增加业务 Tab，不把业务场景塞进 `/demo` 侧栏。
- 不使用 `MarkdownWorkbench`（无编辑器、无分栏、无特性开关 UI、无流式输入、无「示例代码」）。
- 不在业务页展示 Markdown 源码面板。
- **不实现通用 `:::form` Markdown 引擎**；报障表用场景内 Vue 表单，不解析 `:::form` 指令。
- 不接真实 LLM / 工单 / 对象存储后端；追问与提交只走本地预制数据。
- 不把 HTTP 分类卡片默认加回 `/demo`。
- 不为业务文案新增 `/test/*` AST+UI 验收页。
- 不改 `@nnnb/markdown` 引擎 API，不为藏特性面板去改 `@nnnb/markdown-ui` 工作台 API。
- 不为 GFM / 代码高亮 / Mermaid 插件回归再各做一篇业务短场景。

## 站点信息架构

文档站三条线互不混用：

| 入口 | 路由 | 受众 | 内容 |
| --- | --- | --- | --- |
| 功能特点 | `/demo`（现有） | 核对插件、语法、开关 | 现有工作台 Tab，全部保留 |
| 业务场景 | **新建** `/scenes` | 看真实文档长什么样 | 7 个可交互场景 |
| 回归测试 | `/test/*` | 开发 | AST + UI 断言页，不动 |

### 顶栏

将「在线 Demo」拆成两个链接：

- **功能 Demo** → `/demo`
- **业务场景** → `/scenes`

「特性」、各 `/test/*`、GitHub 保持原样。`/scenes` 使用与 Demo 相同的 `docs-main--wide` 布局。

### 首页

- Hero 主按钮：**查看业务场景** → `/scenes`（默认 `tab=assistant`）。
- Hero ghost：**功能 Demo** → `/demo`。
- 在「核心能力」**之上**新增「业务场景」区块：仅三张**主故事**卡（标题 + 业务说明，无代码 snippet、无插件 tag），分别进入对应 `tab`。卡片说明与侧栏 `description` 一致。
- 「核心能力」卡仍进入 `/demo?tab=…`，文案与跳转不改。
- hover / focus 预加载 `Scenes.vue` 与阅读器 chunk。

## 场景清单

`SceneId` 稳定可出现在 URL 中。非法 `?tab=` 回退为 `assistant`。

| id | 侧栏标题 | 分组 | 壳 | 默认打开的 `MarkdownFeatures` |
| --- | --- | --- | --- | --- |
| `assistant` | AI 助手回复 | 主故事 | `assistant` | gfm, breaks, think, mermaid, httpResource |
| `sop` | 发布变更 SOP | 主故事 | `article` | gfm, breaks, mermaid, elTable, httpResource |
| `postmortem` | 线上故障复盘 | 主故事 | `article` | gfm, breaks, codeHighlight, mermaid, elTable, httpResource, math |
| `reasoning` | 助手推理过程 | 短场景 | `assistant` | gfm, breaks, think |
| `attachments` | 工单附件 | 短场景 | `ticket` | gfm, breaks, httpResource |
| `intake` | 报障信息表 | 短场景 | `ticket` | gfm, breaks |
| `capacity` | 容量公式 | 短场景 | `article` | gfm, breaks, math |

未列出的开关一律为 `false`（含 `customTags`）。特性由数据写死，页面不提供开关。

侧栏只显示业务名和一句说明，**不出现** `remark*` / `rehype*` / 插件名。说明文案固定为：

| id | description |
| --- | --- |
| `assistant` | 一条完整的运维助手回复：思考、步骤、流程图与附件；可再问一句 |
| `sop` | 支付网关灰度发布手册：清单、环境表、发布流程 |
| `postmortem` | 订单超时复盘：时间线、时序图、日志与指标 |
| `reasoning` | 同一问题的短问答，只看思考区如何折叠 |
| `attachments` | 报修单里的图、PDF、表格和压缩包，点击可预览 |
| `intake` | 填写并提交报障信息（仅本地演示） |
| `capacity` | 扩容评估里的行内与块级公式 |

## 场景正文大纲

虚构但具体。统一世界观：星河支付、工单 `INC-20260918-0142`、服务 `checkout-api`。不写真实客户数据。正文不出现插件说明书口吻。

### `assistant`：AI 助手回复

客服/运维助手的一条完整回复（对话第一条）。

- 连续两段 `<think>`（可被 MergeThinkRemark 合成 thinkGroup）：先判断权限问题还是 `checkout-api` 故障。
- 结论：当前是 MFA 未通过，不是支付通道宕机。
- 任务列表：已查网关 5xx、待用户确认是否换过手机。
- 一张排障流程图（Mermaid flowchart）。
- 附件：可加载截图一张、故意 404 的图一张、说明书 PDF 链接。
- 结尾：重置 MFA 或继续提单。

### `sop`：发布变更 SOP

知识库里的「支付网关灰度发布」手册。

- 标题、引用块注意事项、有序/无序列表。
- 环境对照表（环境 / 流量 / 负责人）→ ElTable。
- 发布流程图（Mermaid）。
- 回滚条件、值班联系人。
- 一张可加载的架构示意图。

### `postmortem`：线上故障复盘

「订单超时升高」复盘。

- GFM 时间线。
- 时序图：网关 → `checkout-api` → 库存。
- 错误日志代码块（TypeScript 或日志文本）。
- 影响面指标表。
- 网页类外链（监控看板、日志检索），不按图片加载。
- 一小段容量估算行内公式，点到为止。

### `reasoning`：助手推理过程

同一 MFA 问题的短问答。只突出思考区折叠、连续思考合并、正文不再露出 `<think>` 原文。不开 Mermaid / HTTP。同样带底部输入，追问回复更短、仍含 think。

### `attachments`：工单附件

报修单资料清单：图成功/失败、PDF、xlsx、压缩包裸 URL、音频、相对路径与 mailto（后两者不应打标，点击走浏览器默认行为）。

### `intake`：报障信息表

Markdown 只写简短说明（为何要填、工单号、提交后谁会收到）。**表单本身是 Vue 组件，不出现 `:::form` JSON。** 字段与原先模板语义对齐：姓名、是否紧急、紧急时才出现原因、满意度滑条。

### `capacity`：容量公式

扩容评估备忘：行内公式、块级积分或求和、简单矩阵。像工程师笔记，不是 KaTeX 说明书。

主故事覆盖多种能力；短场景只服务一种观感，避免三篇长文互相复制。Mermaid 双引擎 / meta 覆盖仍只属于 `/demo`；业务页里的 Mermaid 卡片保留缩放与 PNG 导出（这是阅读器交互，不是工作台）。

## 页面结构（阅读器 + 场景交互）

`/scenes` **禁止**接入 `MarkdownWorkbench`。

桌面：左场景目录 + 右阅读区。移动端：顶部横向场景条 + 全宽阅读区。

阅读区按 `shell` 包一层薄壳，对齐 docs 色板（slate + `#2563eb`），不新开主题、不仿一整套后台产品。

| shell | 视觉 | 用于 |
| --- | --- | --- |
| `assistant` | 对话：用户/助手气泡 + 底部输入 | `assistant`, `reasoning` |
| `article` | 知识库文章：类型标签 + 标题 + 正文 | `sop`, `postmortem`, `capacity` |
| `ticket` | 工单详情：可复制单号 `INC-20260918-0142` + 正文 | `attachments`, `intake` |

正文（对话里的助手气泡、文章、工单说明）使用 `@nnnb/markdown-ui` 的 `MarkdownRenderer`，传入该场景写死的 `features`，并注入 HTTP 卡片 `components`。

源码默认不展示，不提供折叠源码或复制 MD 工具条。想改语法的人去 `/demo`。

`MarkdownRenderer` / Mermaid 对阅读器 `defineAsyncComponent`，避免从 Home 点进来长时间白屏；加载中可复用 `DemoLoading` 文案改为「正在载入场景…」。

切走场景时清空该场景的本地交互状态（对话追加、表单填写、已打开的预览）。

## 场景交互

三层都要，但工作台不回来。

### 1. 渲染器已有能力（所有相关场景默认可用）

- Think / thinkGroup：折叠、展开。
- Mermaid 卡片：缩放、下载/复制 PNG。
- HTTP 图片：加载成功绿框、失败红框。
- 任务列表若 GFM 渲染为 checkbox，允许勾选（仅 DOM 状态，不写回 Markdown）。

### 2. 助手可再问一句（`assistant`、`reasoning`）

不接模型。壳底部固定输入框 +「发送」。

流程：

1. 进入场景时对话只有一条助手消息（该场景 markdown）。
2. 发送后立刻追加一条用户气泡（纯文本）和一条助手气泡（预制 Markdown，可含 `<think>`）。
3. 按用户输入关键字匹配预制回复，否则走兜底回复（引导去重置 MFA 或提单）。
4. 每个场景最多再追问 **3** 次；达到上限后禁用输入，提示「演示对话已结束，切换场景可重来」。
5. 发送中用短延迟（约 400ms）让思考区有机会出现 loading 观感；不模拟 token 流式打字，避免做成工作台「流式输入」。

预制回复至少覆盖：

| 匹配 | 回复意图 |
| --- | --- |
| 手机 / 换机 / MFA | 确认换机导致 MFA 失败，给出重置步骤 |
| 超时 / 5xx / 支付 | 说明通道正常，指向 checkout 与网关日志 |
| 其它 | 兜底：请提供手机号后四位或工单号 |

`reasoning` 的预制回复更短，必须含一段 think，用来再演示折叠。

### 3. 附件可预览（`attachments`，以及 `assistant` 消息里带 `data-http-kind` 的资源）

点击行为：

| 资源 | 行为 |
| --- | --- |
| `kind=image` 且加载成功 | 打开灯箱，展示大图 |
| `kind=image` 且加载失败 | 打开灯箱，展示失败占位，不跳转死链 |
| `pdf` / `xlsx` / `zip` / `audio` / 其它已打标 kind | 打开预览抽屉：文件名、kind/ext、简短说明；**不请求 example.com 真实文件** |
| 无标记（相对路径、`mailto:`） | 不拦截，浏览器默认 |

预览 UI 用 Element Plus `ElDialog` / `ElDrawer`，色板走 docs-ui。关闭预览或切场景即销毁。

工单壳提供「复制单号」，成功用 `ElMessage`。

### 4. 报障表可填可提交（`intake`）

场景内独立 Vue 表单，字段：

| 字段 | 控件 | 规则 |
| --- | --- | --- |
| 姓名 | 输入框 | 必填 |
| 是否紧急 | 开关 | 默认否 |
| 原因 | 输入框 | 仅「紧急」为是时显示且必填 |
| 满意度 | 滑条 0–100 | 默认 60 |

- 提交：校验失败停留并提示；成功后 `ElMessage.success`，阅读区换成「已提交」结果卡（回显本地 JSON），按钮变为「再填一张」重置表单。
- 不调用接口、不写入 `:::form`、不把该表单做成 `@nnnb/markdown` 能力。
- `/demo` 的表单 Tab 仍是现在的 JSON 说明书，互不影响。

## HTTP 卡片（仅业务阅读器）

现有 `/demo` 工作台不给 `a` / `img` 包分类 UI。业务页必须注入，否则「工单附件」和助手消息里的图/PDF 不像业务。

实现放在 `packages/docs/src/scenes/`，对齐 simple 的 `withHttpResourceMark` + 成功绿框 / 失败红框，**不从 simple 引用源码**。

- `kind=image`：走可失败图片组件；点击走预览，不裸跳转。
- 其它 kind：卡片 + `kind/ext` 徽标；点击走预览抽屉。
- 无标记：普通链接/图片，不加徽标、不拦截。

不把这层 mapping 加回 `/demo`。

## 文件与改动范围

全部在 `packages/docs`：

```text
src/scenes/
  types.ts                 # SceneId、SceneShell、SceneMeta、ChatTurn
  sceneData.ts             # 7 篇 markdown + 侧栏文案
  sceneFeatures.ts         # 每篇写死的 MarkdownFeatures
  cannedReplies.ts         # 助手追问关键字 → 预制 Markdown
  HttpResourceMark.tsx     # a/img 分类卡片 + 点击预览
  httpResourceMark.scss
  AttachmentPreview.vue    # 灯箱 / 文件抽屉
  IntakeForm.vue           # 报障表
  SceneNav.vue             # 主故事 / 短场景目录
  SceneShells.vue          # 三种壳（含对话输入、复制单号）
  SceneReader.vue          # 壳 + MarkdownRenderer + 场景表单
src/pages/Scenes.vue       # query.tab 校验与布局
```

同步改：

- `src/router/index.ts`：注册 `/scenes`，name `Scenes`
- `src/App.vue`：顶栏双入口；`isWidePage` 包含 `Scenes`
- `src/pages/Home.vue`：Hero CTA、业务场景卡片、prefetch

**禁止改动：** `src/demo/**`、`packages/simple/**`、`packages/components/**`、`packages/markdown-ui` 工作台实现。

## 数据流

```text
Home / 顶栏
  → /scenes?tab=assistant
  → Scenes.vue 校验 tab（非法则 router.replace 为 assistant）
  → sceneData + sceneFeatures 取 markdown、壳、features
  → SceneReader
       ├ assistant 壳：初始助手消息 + 本地对话数组 + 输入框
       ├ ticket + intake：说明 Markdown + IntakeForm
       ├ ticket + attachments：Markdown（点击 → AttachmentPreview）
       └ article：Markdown
  → MarkdownRenderer(source, features, http components)
```

场景 Markdown 与预制回复内联在 `sceneData.ts` / `cannedReplies.ts`。无 AbortController / TabContentLoader。无网络问答。

## 错误与边界

- 未知 `tab`：回退 `assistant`，不 404。
- 图片 404：HTTP 图片组件红框；点击仍打开失败灯箱。
- 场景未开启的能力：即使源码出现也不按该能力渲染。
- 追问空内容：不发送。
- 表单校验失败：不进入已提交态。
- 相对路径、`mailto:`：不打标、不拦截。
- 演示提交与追问刷新即丢失，不写 localStorage。

## 验收

以浏览器为准，不为场景 Markdown 建 AST 测试页。

1. `/demo` 工作台 Tab、开关、流式与改前一致。
2. `/scenes` 没有编辑器、特性配置条、工作台「流式输入」、源码面板。
3. 7 个场景可切换；壳类型与上表一致；切走后对话/表单状态清空。
4. `assistant`：可折叠思考、可缩放流程图；输入「换手机了」得到对应预制回复；第 4 次发送被拦住。
5. `attachments`：成功图灯箱、失败图失败灯箱、PDF 抽屉不发起真实下载请求；相对路径无徽标。
6. `intake`：非紧急可提交；紧急且原因为空被拦住；成功后看到回显并可「再填一张」。
7. Home 三张主故事卡、顶栏「业务场景」进入正确 tab。
8. `packages/simple` git diff 为空（本任务范围内）。

## 实现顺序

1. 类型 + `sceneData` / `sceneFeatures` / `cannedReplies`，正文与预制回复按大纲一次写满。
2. HTTP 标记 + `AttachmentPreview` + `SceneReader` / 三种壳。
3. 助手输入与追问上限。
4. `IntakeForm`。
5. `SceneNav` + `Scenes.vue` + 路由 / 顶栏 / Home。
6. 浏览器按验收清单走一遍（含追问、预览、提交三条交互路径）。
