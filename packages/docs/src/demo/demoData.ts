/**
 * 演示 Tab 标识，与示例内容键一致
 */
export type DemoTabId =
  | 'overview'
  | 'gfm'
  | 'math'
  | 'code'
  | 'diagrams'
  | 'mermaid'
  | 'mermaidRoundTrip'
  | 'table'
  | 'think'
  | 'form';

/** 演示分类标识 */
export type DemoCategoryId = 'basic' | 'diagram' | 'extend';

/**
 * 演示分类配置
 */
export const DEMO_CATEGORIES: { id: DemoCategoryId; label: string }[] = [
  { id: 'basic', label: '基础能力' },
  { id: 'diagram', label: '图表' },
  { id: 'extend', label: '扩展' }
];

/**
 * 单个演示 Tab 元数据
 */
export interface DemoTabMeta {
  id: DemoTabId;
  label: string;
  category: DemoCategoryId;
  /** 一句话说明当前示例验证的能力 */
  description: string;
}

/**
 * 单个演示 Tab 的完整配置
 */
interface DemoTabConfig {
  label: string;
  markdown: string;
}

/**
 * 演示 Tab 统一配置（标签与示例内容放在同一数据源）
 */
const DEMO_TAB_CONFIG: Record<DemoTabId, DemoTabConfig> = {
  overview: {
    label: '总览',
    markdown: `# @nnnb/markdown 能力总览

本页通过 **Tab** 分类演示 \`@nnnb/markdown\` 引擎能力与 \`VueMarkdown\` 组合渲染效果。

| Tab | 对应能力 |
| --- | --- |
| GFM 与排版 | \`remark-gfm\`、\`remark-breaks\` |
| 数学公式 | \`remark-math\` + \`rehype-katex\`（\`math.strict: false\`） |
| 代码高亮 | \`CodeHighLight\`（\`CodeBlock\` 组件） |
| 图表 | 复杂 Mermaid 流程图样例 |
| Mermaid 插件 | \`rehypeMermaid\` readme 回归清单（双引擎 / meta） |
| 表格 | \`tableNodeParse\` + Element Plus \`ElTable\` |
| Think 与自定义标签 | \`remarkThink\`（\`customElements\`）+ \`MergeThinkRemark\` 分组 |
| 表单模板 | \`:::form\` 指令块 + JSON 模板 |

请切换到左侧对应 Tab 查看示例源码。`
  },

  gfm: {
    label: 'GFM 与排版',
    markdown: `# GFM 与排版（remark-gfm / remark-breaks）

两个换行外的文本会保留换行（remark-breaks）。

**粗体**、*斜体*、~~删除线~~（关闭 singleTilde 时双波浪线）

## 任务列表
- [x] 已完成项
- [ ] 待办项

## 引用与列表
> 引用块内可以写说明。

1. 有序一
2. 有序二

- 无序 A
- 无序 B

自动链接：<https://example.com>`
  },

  math: {
    label: '数学公式',
    markdown: `# 数学公式（remark-math + KaTeX）

行内：质能方程 $E = mc^2$，以及求和 $\\sum_{i=1}^{n} i$。

块级公式：

$$
\\int_0^1 x^2\\,dx = \\frac{1}{3}
$$

矩阵示例：

$$
\\begin{bmatrix}
1 & 2 \\\\
3 & 4
\\end{bmatrix}
$$
`
  },

  code: {
    label: '代码高亮',
    markdown: `# 代码高亮（CodeHighLight）

\`\`\`typescript
interface User {
  id: string;
  name: string;
}

const u: User = { id: '1', name: 'demo' };
console.log(u.name);
\`\`\`

\`\`\`json
{
  "remark": ["gfm", "math"],
  "rehype": ["katex", "mermaid"]
}
\`\`\`

\`\`\`bash
pnpm install && pnpm run dev
\`\`\`
`
  },

  diagrams: {
    label: '图表',
    /** 大体积样例由 demoMarkdownLoader 按需加载 */
    markdown: ''
  },
  mermaid: {
    label: 'Mermaid 插件',
    markdown: ''
  },
  mermaidRoundTrip: {
    label: 'Mermaid RoundTrip',
    markdown: `# Mermaid JSON ↔ DSL（round-trip）

该示例用于验证 \`@nnnb/markdown\` 新增的引擎能力：

- \`jsonToMermaid(options)\`
- \`mermaidToJson(mermaidCode)\`

## 1) JSON -> Mermaid
\`\`\`typescript
import { jsonToMermaid } from '@nnnb/markdown';

const code = jsonToMermaid({
  type: 'flowchart',
  direction: 'LR',
  data: {
    nodes: [
      { id: 'A', label: '开始', shape: 'circle' },
      { id: 'B', label: '处理', shape: 'rect' },
      { id: 'C', label: '结束', shape: 'circle' }
    ],
    edges: [
      { from: 'A', to: 'B', label: '输入' },
      { from: 'B', to: 'C', label: '输出' }
    ]
  }
});
\`\`\`

## 2) Mermaid -> JSON
\`\`\`typescript
import { mermaidToJson } from '@nnnb/markdown';

const result = mermaidToJson(\`
flowchart LR
  A((开始)) -->|输入| B[处理]
  B -->|输出| C((结束))
\`);
\`\`\`

## 3) 可视化渲染（应正常显示）
\`\`\`mermaid
flowchart LR
  A((开始)) -->|输入| B[处理]
  B -->|输出| C((结束))
\`\`\`
`
  },
  table: {
    label: '表格',
    markdown: `# 表格 → Element Table（tableNodeParse）

下列 GFM 表格在预览中由自定义 \`table\` 组件解析为 \`ElTable\`（含 \`__uuid\` 行键）。

| 产品 | 库存 | 备注 |
| --- | ---: | --- |
| 键盘 | 42 | 机械轴 |
| 鼠标 | 18 | 无线 |
| 显示器 | 7 | 27 寸 |
`
  },

  think: {
    label: 'Think / 自定义',
    markdown: `# Think 与自定义标签（remarkThink + MergeThinkRemark）

## 块级 think（连续两段可被 MergeThinkRemark 合并为 thinkGroup）

<think>
第一条块级思考：用于链式推理或草稿区。
</think>

<think>
第二条块级思考：与上一条同属根级时会进入 thinkGroup 容器。
</think>

## 块级 think（opening tag 后同一行带内容）

<think> 同一行先出现空格再写内容
</think>

## 块级 think（单行紧凑）

<think>单行紧凑写法，opening/closing 同在一段</think>

## 行内 think
行内示例：请在此处插入 <think>简短行内思考</think> 再继续正文。
行内紧凑：<think>紧凑行内</think>；行内带空格：<think> 带空格的行内 </think>。

## custom / other（customElements）
<custom>
通过 \`components.custom\` 渲染的自定义块。
</custom>

<other>
\`other\` 组件演示：可观察 \`meta.loading\` 等节点元信息。
</other>
`
  },

  form: {
    label: '表单模板',
    markdown: `# 表单模板（:::form）

:::form
\`\`\`json
[
  {
    "templateType": "VkfInput",
    "label": "姓名",
    "prop": "name"
  },
  {
    "templateType": "VkfSwitch",
    "label": "是否喜欢",
    "prop": "like"
  },
  {
    "label": "满意度",
    "prop": "degree",
    "templateType": "VkfSlider",
    "min": 0,
    "max": 100
  },
  {
    "templateIf": "return data.like",
    "label": "原因",
    "templateType": "VkfInput",
    "prop": "reason"
  }
]
\`\`\`
:::
`
  }
};

/**
 * Tab 顺序配置（同时用于列表渲染与示例映射生成）
 */
const DEMO_TAB_ORDER: DemoTabId[] = [
  'overview',
  'gfm',
  'math',
  'code',
  'diagrams',
  'mermaid',
  'mermaidRoundTrip',
  'table',
  'think',
  'form'
];

/**
 * 各 Tab 对应的示例 Markdown
 */
export const DEMO_MARKDOWN: Record<DemoTabId, string> = DEMO_TAB_ORDER.reduce(
  (result, id) => {
    result[id] = DEMO_TAB_CONFIG[id].markdown;
    return result;
  },
  {} as Record<DemoTabId, string>
);

/** Tab 扩展元数据：分类与说明 */
const DEMO_TAB_EXTRA: Record<
  DemoTabId,
  Pick<DemoTabMeta, 'category' | 'description'>
> = {
  overview: {
    category: 'basic',
    description: '各能力 Tab 索引与组合说明'
  },
  gfm: {
    category: 'basic',
    description: 'remark-gfm / remark-breaks 排版与 GFM 语法'
  },
  math: {
    category: 'basic',
    description: 'remark-math + rehype-katex 行内与块级公式'
  },
  code: {
    category: 'basic',
    description: 'CodeHighLight 多语言高亮与代码块 UI'
  },
  diagrams: {
    category: 'diagram',
    description: '复杂 flowchart / sequence 等 Mermaid 样例'
  },
  mermaid: {
    category: 'diagram',
    description: 'rehypeMermaid 双引擎与 meta 覆盖回归'
  },
  mermaidRoundTrip: {
    category: 'diagram',
    description: 'jsonToMermaid / mermaidToJson 互转能力'
  },
  table: {
    category: 'extend',
    description: 'tableNodeParse 解析 GFM 表格为结构化数据'
  },
  think: {
    category: 'extend',
    description: 'remarkThink 自定义标签与 thinkGroup 合并'
  },
  form: {
    category: 'extend',
    description: ':::form 指令块与 JSON 表单模板'
  }
};

/**
 * Tab 列表（顺序即界面展示顺序）
 */
export const demoTabList: DemoTabMeta[] = DEMO_TAB_ORDER.map((id) => ({
  id,
  label: DEMO_TAB_CONFIG[id].label,
  ...DEMO_TAB_EXTRA[id]
}));

/**
 * 按分类分组的 Tab 列表
 */
export function getDemoTabsByCategory(): {
  category: (typeof DEMO_CATEGORIES)[number];
  tabs: DemoTabMeta[];
}[] {
  return DEMO_CATEGORIES.map((category) => ({
    category,
    tabs: demoTabList.filter((tab) => tab.category === category.id)
  }));
}

/**
 * 根据 Tab id 获取元数据
 * @param id Tab 标识
 */
export function getDemoTabMeta(id: DemoTabId): DemoTabMeta | undefined {
  return demoTabList.find((tab) => tab.id === id);
}
