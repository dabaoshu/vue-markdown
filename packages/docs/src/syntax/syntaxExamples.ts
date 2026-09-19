import type { MarkdownFeatures } from '@nnnb/markdown-ui';

/**
 * 语法示例标识，可出现在 `/syntax?id=`。
 */
export type SyntaxExampleId =
  | 'heading'
  | 'emphasis'
  | 'quote'
  | 'list'
  | 'task'
  | 'link'
  | 'code'
  | 'table'
  | 'math'
  | 'mermaid'
  | 'think';

/**
 * 一条语法示例。
 */
export interface SyntaxExample {
  id: SyntaxExampleId;
  title: string;
  /** 侧栏一句说明 */
  hint: string;
  markdown: string;
  features: Partial<MarkdownFeatures>;
}

/**
 * 语法分组。
 */
export interface SyntaxGroup {
  id: string;
  title: string;
  items: SyntaxExample[];
}

const BASE_FEATURES: Partial<MarkdownFeatures> = {
  gfm: true,
  breaks: true,
  math: false,
  mermaid: false,
  think: false,
  codeHighlight: false,
  customTags: false,
  elTable: false,
  httpResource: false
};

/**
 * 在基础排版开关上叠加本条示例需要的能力。
 *
 * @param extra 覆盖项
 */
function withFeatures(extra: Partial<MarkdownFeatures> = {}): Partial<MarkdownFeatures> {
  return { ...BASE_FEATURES, ...extra };
}

/** 默认打开的示例 */
export const DEFAULT_SYNTAX_ID: SyntaxExampleId = 'heading';

/** 语法速查分组与示例 */
export const SYNTAX_GROUPS: SyntaxGroup[] = [
  {
    id: 'basic',
    title: '基础排版',
    items: [
      {
        id: 'heading',
        title: '标题',
        hint: '# 到 ######',
        features: withFeatures(),
        markdown: `# 一级标题
## 二级标题
### 三级标题

正文另起一段。`
      },
      {
        id: 'emphasis',
        title: '强调',
        hint: '**粗体** / *斜体*',
        features: withFeatures(),
        markdown: `这是 **粗体**，这是 *斜体*，这是 ~~删除线~~。

也可以用 \`行内代码\` 标出标识符。`
      },
      {
        id: 'quote',
        title: '引用',
        hint: '> 引用',
        features: withFeatures(),
        markdown: `> 引用可以叠一层说明。
>
> 第二段仍然属于引用。`
      }
    ]
  },
  {
    id: 'block',
    title: '列表与任务',
    items: [
      {
        id: 'list',
        title: '列表',
        hint: '- / 1.',
        features: withFeatures(),
        markdown: `- 无序一项
- 无序二项
  - 嵌套子项

1. 先做准备
2. 再写正文
3. 最后检查`
      },
      {
        id: 'task',
        title: '任务列表',
        hint: '- [x]',
        features: withFeatures(),
        markdown: `- [x] 已完成的步骤
- [ ] 待办事项
- [ ] 需要复查的项`
      }
    ]
  },
  {
    id: 'media',
    title: '链接与代码',
    items: [
      {
        id: 'link',
        title: '链接',
        hint: '[文案](url)',
        features: withFeatures(),
        markdown: `站内说明见 [功能 Demo](/demo)。

外部文档：[CommonMark](https://commonmark.org/)。`
      },
      {
        id: 'code',
        title: '代码块',
        hint: '```lang',
        features: withFeatures({ codeHighlight: true }),
        markdown: `安装：

\`\`\`bash
pnpm add @nnnb/markdown
\`\`\`

\`\`\`ts
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
\`\`\``
      }
    ]
  },
  {
    id: 'gfm',
    title: 'GFM 扩展',
    items: [
      {
        id: 'table',
        title: '表格',
        hint: '| 列 |',
        features: withFeatures(),
        markdown: `| 语法 | 效果 |
| --- | --- |
| \`**粗体**\` | **粗体** |
| \`- 列表\` | 无序列表 |`
      }
    ]
  },
  {
    id: 'extra',
    title: '本库扩展',
    items: [
      {
        id: 'math',
        title: '公式',
        hint: '$...$',
        features: withFeatures({ math: true }),
        markdown: `行内：$E = mc^2$

块级：

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$`
      },
      {
        id: 'mermaid',
        title: 'Mermaid',
        hint: '```mermaid',
        features: withFeatures({ mermaid: true }),
        markdown: `\`\`\`mermaid
flowchart LR
  A[编写 Markdown] --> B[解析]
  B --> C[渲染预览]
\`\`\``
      },
      {
        id: 'think',
        title: '思考块',
        hint: '<think>',
        features: withFeatures({ think: true }),
        markdown: `<think>
先确认需求是语法速查，再给出最小示例。
</think>

结论：用对照预览比只贴文档更直观。`
      }
    ]
  }
];

/** 展平后的全部示例，顺序与侧栏一致 */
export const SYNTAX_EXAMPLES: SyntaxExample[] = SYNTAX_GROUPS.flatMap(
  (group) => group.items
);

const SYNTAX_ID_SET = new Set<string>(SYNTAX_EXAMPLES.map((item) => item.id));

/**
 * 把 URL query.id 收成合法示例 id。
 *
 * @param raw `route.query.id`
 */
export function resolveSyntaxId(raw: unknown): SyntaxExampleId {
  const id = typeof raw === 'string' ? raw : DEFAULT_SYNTAX_ID;
  return SYNTAX_ID_SET.has(id) ? (id as SyntaxExampleId) : DEFAULT_SYNTAX_ID;
}

/**
 * 按 id 取示例。id 须已通过 resolveSyntaxId。
 *
 * @param id 合法示例 id
 */
export function getSyntaxExample(id: SyntaxExampleId): SyntaxExample {
  const found = SYNTAX_EXAMPLES.find((item) => item.id === id);
  if (!found) {
    return SYNTAX_EXAMPLES[0];
  }
  return found;
}
