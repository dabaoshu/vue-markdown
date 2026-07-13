import { thinkTags } from './helpers';
import type { RemarkThinkTestCase } from './types';

const { open, close } = thinkTags('think');
const custom = thinkTags('custom');
const other = thinkTags('other');
const analysis = thinkTags('analysis');

/**
 * remark-think 完整测试用例集。
 *
 * 覆盖：
 * - 块级三种写法（换行 / 同行空格 / 单行紧凑）
 * - 行内写法与多实例
 * - MergeThinkRemark 合并
 * - 多标签 / customElements
 * - 与普通 Markdown 混排
 * - 边界与负向（不抛错、不误识别）
 */
export const REMARK_THINK_CASES: RemarkThinkTestCase[] = [
  // ─────────────────── A. 块级 ───────────────────
  {
    id: 'block-classic-multiline',
    title: '块级：标准换行围栏',
    group: 'block',
    description: 'opening 与 closing 各自独占一行，内容在中间行。',
    markdown: `${open}\nasdasd\n${close}`,
    expect: {
      rootChildTypes: ['thinkFlow'],
      thinkFlowCount: 1,
      contentIncludes: ['asdasd']
    }
  },
  {
    id: 'block-same-line-space',
    title: '块级：opening 后同行带空格内容',
    group: 'block',
    description: '`<think> content` 后换行再闭合。',
    markdown: `${open} dadasdas\n${close}`,
    expect: {
      rootChildTypes: ['thinkFlow'],
      thinkFlowCount: 1,
      contentIncludes: ['dadasdas']
    }
  },
  {
    id: 'block-same-line-no-leading-space',
    title: '块级：opening 后同行无前导空格，closing 换行',
    group: 'block',
    description: '`<think>content` 同行开始写内容，下一行闭合。',
    markdown: `${open}hello-world\n${close}`,
    expect: {
      rootChildTypes: ['thinkFlow'],
      thinkFlowCount: 1,
      contentIncludes: ['hello-world']
    }
  },
  {
    id: 'block-compact-single-line',
    title: '块级：单行紧凑',
    group: 'block',
    description: 'opening / 内容 / closing 在同一行。',
    markdown: `${open}dasdsadsa${close}`,
    expect: {
      rootChildTypes: ['thinkFlow'],
      thinkFlowCount: 1,
      contentIncludes: ['dasdsadsa']
    }
  },
  {
    id: 'block-multiline-body',
    title: '块级：多行正文',
    group: 'block',
    description: '内容区包含多行文本。',
    markdown: `${open}\nline-1\nline-2\nline-3\n${close}`,
    expect: {
      thinkFlowCount: 1,
      contentIncludes: ['line-1', 'line-2', 'line-3']
    }
  },
  {
    id: 'block-empty-body',
    title: '块级：空内容',
    group: 'block',
    description: '开闭标签之间无实质文本，仍应解析为 thinkFlow。',
    markdown: `${open}\n${close}`,
    expect: {
      thinkFlowCount: 1
    }
  },
  {
    id: 'block-compact-empty',
    title: '块级：紧凑空内容',
    group: 'block',
    description: '`<think></think>` 应能解析且不抛错。',
    markdown: `${open}${close}`,
    expect: {
      noThrow: true,
      thinkFlowCount: 1
    }
  },
  {
    id: 'block-with-inner-angle-bracket',
    title: '块级：内容含小于号',
    group: 'block',
    description: '内容里的 `<` 不是合法 closing tag 时，应作为正文保留。',
    markdown: `${open}\na < b 且 a > c\n${close}`,
    expect: {
      thinkFlowCount: 1,
      contentIncludes: ['a < b']
    }
  },

  // ─────────────────── B. 行内 ───────────────────
  {
    id: 'inline-basic',
    title: '行内：段落中间紧凑',
    group: 'inline',
    description: '正文夹杂 `<think>...</think>`。',
    markdown: `text ${open}dasdsadsa${close} end`,
    expect: {
      rootChildTypes: ['paragraph'],
      inlineTagName: 'think',
      contentIncludes: ['dasdsadsa', 'text', 'end']
    }
  },
  {
    id: 'inline-with-spaces',
    title: '行内：标签内带空格',
    group: 'inline',
    description: '`<think> dadasdas </think>`。',
    markdown: `text ${open} dadasdas ${close} end`,
    expect: {
      rootChildTypes: ['paragraph'],
      inlineTagName: 'think',
      contentIncludes: ['dadasdas']
    }
  },
  {
    id: 'inline-chinese-context',
    title: '行内：中文上下文',
    group: 'inline',
    description: '回归 Vite/micromark(dev) 下「expected character to be consumed」问题。',
    markdown: `请在此处插入 ${open}简短行内思考${close} 再继续正文。`,
    expect: {
      rootChildTypes: ['paragraph'],
      inlineTagName: 'think',
      contentIncludes: ['简短行内思考', '请在此处插入', '再继续正文']
    }
  },
  {
    id: 'inline-multiple-in-paragraph',
    title: '行内：同一段落多个 think',
    group: 'inline',
    description: '一段内连续出现两处行内 think。',
    markdown: `A ${open}one${close} B ${open}two${close} C`,
    expect: {
      rootChildTypes: ['paragraph'],
      inlineTagName: 'think',
      contentIncludes: ['one', 'two', 'A', 'B', 'C']
    }
  },
  {
    id: 'inline-mixed-compact-and-spaced',
    title: '行内：紧凑与带空格混用',
    group: 'inline',
    description: 'demo 页「行内紧凑 + 行内带空格」组合。',
    markdown: `行内紧凑：${open}紧凑行内${close}；行内带空格：${open} 带空格的行内 ${close}。`,
    expect: {
      rootChildTypes: ['paragraph'],
      inlineTagName: 'think',
      contentIncludes: ['紧凑行内', '带空格的行内']
    }
  },
  {
    id: 'inline-at-paragraph-start',
    title: '行内：位于段首（前有文字占位则仍为行内）',
    group: 'inline',
    description: '前缀文本保证进入 text 上下文而非 flow。',
    markdown: `前缀 ${open}head${close}`,
    expect: {
      rootChildTypes: ['paragraph'],
      inlineTagName: 'think',
      contentIncludes: ['head', '前缀']
    }
  },

  // ─────────────────── C. MergeThinkRemark ───────────────────
  {
    id: 'merge-two-consecutive-blocks',
    title: '合并：连续两段块级 think',
    group: 'merge',
    description: 'root 下连续 thinkFlow 应合并为一个 thinkGroup。',
    markdown: `${open}\nfirst\n${close}\n\n${open}\nsecond\n${close}`,
    merge: true,
    expect: {
      thinkGroupCount: 1,
      firstThinkGroupSize: 2,
      contentIncludes: ['first', 'second']
    }
  },
  {
    id: 'merge-three-consecutive-blocks',
    title: '合并：连续三段',
    group: 'merge',
    description: '三段连续块级合并为同一 group。',
    markdown: `${open}\na\n${close}\n\n${open}\nb\n${close}\n\n${open}\nc\n${close}`,
    merge: true,
    expect: {
      thinkGroupCount: 1,
      firstThinkGroupSize: 3,
      contentIncludes: ['a', 'b', 'c']
    }
  },
  {
    id: 'merge-separated-by-heading',
    title: '合并：中间有标题打断',
    group: 'merge',
    description: '标题会打断连续性，应得到两个 thinkGroup。',
    markdown: `${open}\none\n${close}\n\n## Mid\n\n${open}\ntwo\n${close}`,
    merge: true,
    expect: {
      thinkGroupCount: 2,
      contentIncludes: ['one', 'two', 'Mid']
    }
  },
  {
    id: 'merge-compact-and-classic',
    title: '合并：紧凑块 + 经典块相邻',
    group: 'merge',
    description: '不同写法的 thinkFlow 连续出现也应合并。',
    markdown: `${open}compact${close}\n\n${open}\nclassic\n${close}`,
    merge: true,
    expect: {
      thinkGroupCount: 1,
      firstThinkGroupSize: 2,
      contentIncludes: ['compact', 'classic']
    }
  },
  {
    id: 'merge-same-line-space-block',
    title: '合并：同行空格写法参与合并',
    group: 'merge',
    description: 'same-line-space 格式也应进入 thinkGroup。',
    markdown: `${open} alpha\n${close}\n\n${open} beta\n${close}`,
    merge: true,
    expect: {
      thinkGroupCount: 1,
      firstThinkGroupSize: 2,
      contentIncludes: ['alpha', 'beta']
    }
  },

  // ─────────────────── D. 多标签 ───────────────────
  {
    id: 'multi-tag-custom-block',
    title: '多标签：custom 块级',
    group: 'multi-tag',
    description: 'tags 含 custom 时应识别 custom 围栏。',
    markdown: `${custom.open}\ncustom-body\n${custom.close}`,
    tags: ['think', 'custom', 'other'],
    expect: {
      thinkFlowCount: 1,
      contentIncludes: ['custom-body']
    }
  },
  {
    id: 'multi-tag-other-block',
    title: '多标签：other 块级',
    group: 'multi-tag',
    description: 'tags 含 other 时应识别 other 围栏。',
    markdown: `${other.open}\nother-body\n${other.close}`,
    tags: ['think', 'custom', 'other'],
    expect: {
      thinkFlowCount: 1,
      contentIncludes: ['other-body']
    }
  },
  {
    id: 'multi-tag-think-and-custom-mixed',
    title: '多标签：think + custom 同文档',
    group: 'multi-tag',
    description: '同一文档多种自定义标签均可解析。',
    markdown: `${open}\nth\n${close}\n\n${custom.open}\ncu\n${custom.close}`,
    tags: ['think', 'custom'],
    merge: true,
    expect: {
      thinkGroupCount: 1,
      firstThinkGroupSize: 2,
      contentIncludes: ['th', 'cu']
    }
  },
  {
    id: 'multi-tag-unknown-not-matched',
    title: '多标签：未配置的标签不应被识别为 think',
    group: 'multi-tag',
    description: '仅配置 think 时，analysis 标签不应成为 thinkFlow。',
    markdown: `${analysis.open}\nnope\n${analysis.close}`,
    tags: ['think'],
    expect: {
      noThrow: true,
      noThinkNodes: true
    }
  },

  // ─────────────────── E. 与 Markdown 混排 ───────────────────
  {
    id: 'mixed-with-headings',
    title: '混排：标题 + 三种块级写法 + 行内',
    group: 'mixed',
    description: '贴近 docs Think Tab 的综合样例。',
    markdown: `# Title

## Block

${open}
block-a
${close}

## Same line

${open} block-b
${close}

## Compact

${open}block-c${close}

## Inline

前后 ${open}inline-x${close} 文字
`,
    merge: true,
    expect: {
      thinkGroupCount: 3,
      inlineTagName: 'think',
      contentIncludes: ['block-a', 'block-b', 'block-c', 'inline-x', 'Title']
    }
  },
  {
    id: 'mixed-after-paragraph',
    title: '混排：段落后接块级 think',
    group: 'mixed',
    description: '普通段落后出现块级 think。',
    markdown: `Hello paragraph.\n\n${open}\nthink-after-p\n${close}`,
    expect: {
      rootChildTypes: ['paragraph', 'thinkFlow'],
      contentIncludes: ['Hello paragraph', 'think-after-p']
    }
  },
  {
    id: 'mixed-inside-fenced-code-not-flow',
    title: '混排：代码围栏内标签不作为 thinkFlow',
    group: 'mixed',
    description: 'fenced code 内的尖括号标签应保持为代码文本，不产生 thinkFlow。',
    markdown: ['```md', `${open}`, 'code', `${close}`, '```'].join('\n'),
    expect: {
      noThrow: true,
      noThinkNodes: true,
      contentIncludes: ['code']
    }
  },

  // ─────────────────── F. 边界 / 负向 ───────────────────
  {
    id: 'edge-unclosed-open',
    title: '边界：只有 opening 无 closing',
    group: 'edge',
    description: '流式未闭合场景，解析不得抛错。',
    markdown: `${open}\npartial content`,
    expect: {
      noThrow: true
    }
  },
  {
    id: 'edge-only-close-tag',
    title: '边界：只有 closing 标签',
    group: 'edge',
    description: '孤立 closing 不应崩溃。',
    markdown: `${close}`,
    expect: {
      noThrow: true,
      noThinkNodes: true
    }
  },
  {
    id: 'edge-plain-text-with-angle',
    title: '边界：普通文本含尖括号',
    group: 'edge',
    description: '非标签形态的 `<foo>` 不应被识别为 think。',
    markdown: `compare a < b and use <foo> bar`,
    expect: {
      noThrow: true,
      noThinkNodes: true
    }
  },
  {
    id: 'edge-streaming-compact-prefix',
    title: '边界：紧凑写法流式前缀',
    group: 'edge',
    description: '仅出现完整 opening + 部分内容，未闭合。',
    markdown: `${open}partial`,
    expect: {
      noThrow: true
    }
  },
  {
    id: 'edge-blank-document',
    title: '边界：空文档',
    group: 'edge',
    description: '空输入应安全返回空 root。',
    markdown: '',
    expect: {
      noThrow: true,
      rootChildTypes: [],
      noThinkNodes: true
    }
  },
  {
    id: 'edge-whitespace-only-around-tags',
    title: '边界：标签前后大量空白',
    group: 'edge',
    description: '前后空行不影响块级识别。',
    markdown: `\n\n${open}\nbody\n${close}\n\n`,
    expect: {
      thinkFlowCount: 1,
      contentIncludes: ['body']
    }
  }
];

/**
 * 按分组筛选用例。
 *
 * @param group 分组名；不传则返回全部。
 */
export function getRemarkThinkCases(
  group?: RemarkThinkTestCase['group']
): RemarkThinkTestCase[] {
  if (!group) return REMARK_THINK_CASES;
  return REMARK_THINK_CASES.filter((item) => item.group === group);
}
