import type { CodeHighlightTestCase } from './types';

/**
 * CodeHighLight / CodeBlock 测试用例。
 */
export const CODE_HIGHLIGHT_CASES: CodeHighlightTestCase[] = [
  {
    id: 'fence-typescript',
    title: '围栏：TypeScript',
    group: 'fence',
    description: '```typescript 应解析为 code.lang=typescript，并高亮渲染。',
    markdown: `\`\`\`typescript
interface User {
  id: string;
  name: string;
}
const u: User = { id: '1', name: 'demo' };
\`\`\`
`,
    expect: {
      codeCount: 1,
      firstCodeLang: 'typescript',
      codeValueIncludes: ['interface User', 'name: string'],
      contentIncludes: ['interface User']
    }
  },
  {
    id: 'fence-json',
    title: '围栏：JSON',
    group: 'lang',
    description: 'json 代码块应保留 lang 与内容。',
    markdown: `\`\`\`json
{
  "remark": ["gfm", "math"]
}
\`\`\`
`,
    expect: {
      codeCount: 1,
      firstCodeLang: 'json',
      codeValueIncludes: ['"remark"', 'gfm']
    }
  },
  {
    id: 'fence-bash',
    title: '围栏：bash',
    group: 'lang',
    description: 'bash 安装命令应出现在 AST 与 UI。',
    markdown: `\`\`\`bash
pnpm install && pnpm run dev
\`\`\`
`,
    expect: {
      codeCount: 1,
      firstCodeLang: 'bash',
      codeValueIncludes: ['pnpm install']
    }
  },
  {
    id: 'fence-multi',
    title: '围栏：多个代码块',
    group: 'fence',
    description: '同一文档多个 fence 均应解析。',
    markdown: `\`\`\`js
const a = 1
\`\`\`

\`\`\`css
.a { color: red; }
\`\`\`
`,
    expect: {
      codeCount: 2,
      codeValueIncludes: ['const a = 1', 'color: red']
    }
  },
  {
    id: 'inline-code-not-block',
    title: '行内：不应走 CodeBlock',
    group: 'inline',
    description: '行内 \`code\` 不是围栏，UI 不应出现代码块容器 / hljs。',
    markdown: `请使用 \`pnpm install\` 安装依赖。`,
    expect: {
      noCodeFence: true,
      codeCount: 0,
      contentIncludes: ['pnpm install'],
      ui: {
        missing: ['code.hljs', '[class*="code-block"]'],
        textIncludes: ['pnpm install']
      }
    }
  },
  {
    id: 'edge-no-highlight-component',
    title: '负向：未挂载高亮组件',
    group: 'edge',
    description: 'highlight=false 时仍有 code AST，但无 CodeBlock / hljs UI。',
    markdown: `\`\`\`typescript
const x = 1
\`\`\`
`,
    highlight: false,
    expect: {
      codeCount: 1,
      firstCodeLang: 'typescript',
      codeValueIncludes: ['const x = 1'],
      ui: {
        missing: ['code.hljs', '[class*="code-block"]'],
        textIncludes: ['const x = 1']
      }
    }
  },
  {
    id: 'edge-unknown-lang',
    title: '边界：未知语言仍渲染块',
    group: 'edge',
    description: '未注册语言仍应产出 code 节点与代码块 UI。',
    markdown: `\`\`\`notalang
hello-world-token
\`\`\`
`,
    expect: {
      codeCount: 1,
      firstCodeLang: 'notalang',
      codeValueIncludes: ['hello-world-token'],
      ui: {
        has: [{ selector: '[class*="code-block"]', min: 1 }],
        textIncludes: ['hello-world-token', 'notalang']
      }
    }
  }
];

/**
 * 获取全部用例。
 */
export function getCodeHighlightCases(): CodeHighlightTestCase[] {
  return CODE_HIGHLIGHT_CASES;
}
