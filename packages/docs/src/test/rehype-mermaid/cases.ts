import type { RehypeMermaidTestCase } from './types';

/**
 * rehypeMermaid 测试用例（AST 看 mdast fence；UI 看 .mermaid-block）。
 */
export const REHYPE_MERMAID_CASES: RehypeMermaidTestCase[] = [
  {
    id: 'flowchart-basic',
    title: '流程图：基础 LR',
    group: 'flowchart',
    description: '```mermaid flowchart 应解析为 mermaid fence，并渲染 MermaidBlock。',
    markdown: `\`\`\`mermaid
flowchart LR
  A((开始)) -->|输入| B[处理]
  B -->|输出| C((结束))
\`\`\`
`,
    expect: {
      mermaidCodeCount: 1,
      codeValueIncludes: ['flowchart LR', 'A((开始))'],
      contentIncludes: []
    }
  },
  {
    id: 'flowchart-td',
    title: '流程图：TD 方向',
    group: 'flowchart',
    description: 'TD 流程图应保留在 code.value。',
    markdown: `\`\`\`mermaid
flowchart TD
  Start --> Stop
\`\`\`
`,
    expect: {
      mermaidCodeCount: 1,
      codeValueIncludes: ['flowchart TD', 'Start --> Stop']
    }
  },
  {
    id: 'meta-engine-mermaid',
    title: 'Meta：engine=mermaid',
    group: 'meta',
    description: 'fence meta 应保留；UI 仍应挂载 .mermaid-block。',
    markdown: `\`\`\`mermaid engine=mermaid
flowchart LR
  X --> Y
\`\`\`
`,
    expect: {
      mermaidCodeCount: 1,
      metaIncludes: ['engine=mermaid'],
      codeValueIncludes: ['X --> Y']
    }
  },
  {
    id: 'edge-plain-code-not-mermaid',
    title: '负向：普通代码块',
    group: 'edge',
    description: 'typescript fence 不应变成 MermaidBlock。',
    markdown: `\`\`\`typescript
const a = 1
\`\`\`
`,
    expect: {
      noMermaidFence: true,
      mermaidCodeCount: 0,
      codeCount: 1,
      codeValueIncludes: ['const a = 1'],
      ui: {
        missing: ['.mermaid-block'],
        textIncludes: ['const a = 1']
      }
    }
  },
  {
    id: 'edge-mermaid-plugin-off',
    title: '负向：关闭 Mermaid 插件',
    group: 'edge',
    description: 'AST 仍有 mermaid fence，但未接线插件时 UI 无 .mermaid-block。',
    markdown: `\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`
`,
    mermaidEnabled: false,
    expect: {
      mermaidCodeCount: 1,
      codeValueIncludes: ['A --> B'],
      ui: {
        missing: ['.mermaid-block'],
        textIncludes: ['flowchart LR', 'A --> B']
      }
    }
  },
  {
    id: 'edge-invalid-syntax',
    title: '边界：非法 DSL 仍挂载块',
    group: 'edge',
    description: '语法错误仍应出现 MermaidBlock 容器（错误态由组件处理）。',
    markdown: `\`\`\`mermaid
this is not valid mermaid !!!
\`\`\`
`,
    expect: {
      mermaidCodeCount: 1,
      codeValueIncludes: ['this is not valid mermaid'],
      ui: {
        has: [{ selector: '.mermaid-block', min: 1 }]
      }
    }
  }
];

/**
 * 获取全部用例。
 */
export function getRehypeMermaidCases(): RehypeMermaidTestCase[] {
  return REHYPE_MERMAID_CASES;
}
