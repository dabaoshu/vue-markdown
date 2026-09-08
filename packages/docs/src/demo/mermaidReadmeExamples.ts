/**
 * remark-mermaid readme 回归清单对应的演示 Markdown。
 * @description 与 `packages/components/remark-mermaid/readme.md` 中「测试用例」及 meta 示例一一对应
 */

/** 用例 1：默认 Mermaid 引擎渲染 */
const CASE_DEFAULT_MERMAID = `## 用例 1：默认 Mermaid 渲染

预期：未写 \`engine\` meta 时走官方 \`mermaid\` 引擎，输出 SVG。

\`\`\`mermaid
graph LR
  A --> B
\`\`\`
`;

/** 用例 2：beautiful SVG + 块级 theme */
const CASE_BEAUTIFUL_SVG = `## 用例 2：beautiful SVG（\`engine=beautiful\`）

预期：走 \`beautiful-mermaid\` 渲染路径，\`theme=dark\` 应用内置主题色。

\`\`\`mermaid engine=beautiful theme=dark
flowchart TD
  A --> B
\`\`\`
`;

/** readme「代码块 meta 覆盖」：forest + transparent */
const CASE_META_FOREST = `## Meta：beautiful 主题覆盖（readme 示例）

\`\`\`mermaid engine=beautiful theme=forest transparent=true
flowchart LR
  A[Alpha] --> B[Beta]
\`\`\`
`;

/** 用例 3：ASCII 输出 */
const CASE_ASCII = `## 用例 3：ASCII 输出

预期：输出 \`<pre><code>\` 文本图，不注入 SVG。

\`\`\`mermaid engine=beautiful output=ascii
flowchart LR
  A --> B
\`\`\`

### 带 padding 的 sequenceDiagram（readme 示例）

\`\`\`mermaid engine=beautiful output=ascii paddingX=2 paddingY=1
sequenceDiagram
  Alice->>Bob: Hello
\`\`\`
`;

/** 用例 4：仅展示源码 */
const CASE_SOURCE_ONLY = `## 用例 4：块级 meta — 保留源码

预期：不渲染图表、不显示加载遮罩。

\`\`\`mermaid renderSvg=false showLoading=false
flowchart TD
  A --> B
\`\`\`
`;

/** 用例 5：空代码块 */
const CASE_EMPTY = `## 用例 5：空代码块

预期（\`fallbackMode='keep-code'\`，当前 simple 默认）：保留原始空 \`<pre><code>\` 围栏。

\`\`\`mermaid

\`\`\`
`;

/** 用例 6：非法 DSL */
const CASE_INVALID_DSL = `## 用例 6：非法 DSL

预期：进入错误遮罩；流式测试时可先见 \`Streaming diagram...\` 宽限文案。

\`\`\`mermaid
graph TD
  A ->-> B
\`\`\`
`;

/** 对照：同图默认引擎 vs beautiful，便于肉眼对比 */
const CASE_SIDE_BY_SIDE = `## 对照：同 DSL 双引擎

### 官方 mermaid

\`\`\`mermaid
flowchart LR
  Start([开始]) --> Check{校验}
  Check -->|通过| Done[完成]
  Check -->|失败| Retry[重试]
\`\`\`

### beautiful（theme=forest）

\`\`\`mermaid engine=beautiful theme=forest
flowchart LR
  Start([开始]) --> Check{校验}
  Check -->|通过| Done[完成]
  Check -->|失败| Retry[重试]
\`\`\`
`;

/** 用例 8：卡片 PNG 下载 / 复制（SVG 光栅化） */
const CASE_PNG_EXPORT = `## 用例 8：卡片 PNG 下载 / 复制

预期：预览工具栏「下载」「复制」走 \`downloadSvgAsPng\` / \`copySvgAsPng\`，直接光栅化已渲染 SVG，**不使用 html2canvas 截整页**。点击后按钮短暂显示「导出中」，页面不应卡顿。

\`\`\`mermaid
mindmap
  root((导出))
    下载 PNG
    复制图片
    viewBox 尺寸
\`\`\`
`;

/**
 * readme 回归演示全文（供「Mermaid 插件」Tab 载入）
 */
export const MERMAID_README_DEMO_MARKDOWN = `# remark-mermaid 演示

本 Tab 内容与 \`packages/components/remark-mermaid/readme.md\` 对齐，用于在 docs Demo 预览中回归：

- 双引擎：\`mermaid\` / \`beautiful\`
- 块级 meta 覆盖（\`enableMetaOptions: true\`）
- ASCII、仅源码、空块、错误 DSL
- 卡片工具栏 PNG 下载 / 复制（SVG 光栅化，非 html2canvas）

工具栏 **流式测试** 可观察 \`streamErrorGraceMs\` 宽限与 pending 文案。

${[
  CASE_DEFAULT_MERMAID,
  CASE_BEAUTIFUL_SVG,
  CASE_META_FOREST,
  CASE_ASCII,
  CASE_SOURCE_ONLY,
  CASE_EMPTY,
  CASE_INVALID_DSL,
  CASE_SIDE_BY_SIDE,
  CASE_PNG_EXPORT
].join('\n')}
`;
