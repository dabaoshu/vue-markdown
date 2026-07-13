import type { RemarkMathTestCase } from './types';

/**
 * remark-math + KaTeX 测试用例。
 */
export const REMARK_MATH_CASES: RemarkMathTestCase[] = [
  {
    id: 'inline-basic',
    title: '行内：基础公式',
    group: 'inline',
    description: '$E = mc^2$ 应解析为 inlineMath。',
    markdown: `质能方程 $E = mc^2$ 很有名。`,
    expect: {
      inlineMathCount: 1,
      mathCount: 0,
      mathValueIncludes: ['E = mc^2'],
      contentIncludes: ['质能方程', '很有名']
    }
  },
  {
    id: 'inline-sum',
    title: '行内：求和符号',
    group: 'inline',
    description: '含下标的行内公式应完整保留 value。',
    markdown: `求和 $\\sum_{i=1}^{n} i$。`,
    expect: {
      inlineMathCount: 1,
      mathValueIncludes: ['\\sum_{i=1}^{n} i']
    }
  },
  {
    id: 'block-frac',
    title: '块级：分数',
    group: 'block',
    description: '$$...$$ 应解析为 math 节点。',
    markdown: `$$
\\int_0^1 x^2\\,dx = \\frac{1}{3}
$$
`,
    expect: {
      mathCount: 1,
      inlineMathCount: 0,
      mathValueIncludes: ['\\frac{1}{3}']
    }
  },
  {
    id: 'block-matrix',
    title: '块级：矩阵',
    group: 'block',
    description: 'bmatrix 环境应保留在 math.value。',
    markdown: `$$
\\begin{bmatrix}
1 & 2 \\\\
3 & 4
\\end{bmatrix}
$$
`,
    expect: {
      mathCount: 1,
      mathValueIncludes: ['bmatrix', '1 & 2']
    }
  },
  {
    id: 'mixed-inline-and-block',
    title: '混排：行内 + 块级',
    group: 'mixed',
    description: '同一文档可同时存在 inlineMath 与 math。',
    markdown: `行内 $a+b$，然后块级：

$$
c+d
$$
`,
    expect: {
      inlineMathCount: 1,
      mathCount: 1,
      mathValueIncludes: ['a+b', 'c+d']
    }
  },
  {
    id: 'edge-no-math-enabled',
    title: '负向：关闭 math 时不当作公式',
    group: 'edge',
    description: 'mathEnabled=false 时，美元符号应保留为普通文本。',
    markdown: `价格 $99 与 $E=mc^2$ 混写。`,
    mathEnabled: false,
    expect: {
      noMathNodes: true,
      inlineMathCount: 0,
      mathCount: 0,
      contentIncludes: ['$']
    }
  },
  {
    id: 'edge-plain-text',
    title: '边界：无公式纯文本',
    group: 'edge',
    description: '普通段落不应产出 math 节点。',
    markdown: `这里没有任何美元符号公式。`,
    expect: {
      noMathNodes: true,
      inlineMathCount: 0,
      mathCount: 0,
      contentIncludes: ['没有任何美元符号']
    }
  },
  {
    id: 'edge-escaped-feel',
    title: '边界：代码中的美元符号',
    group: 'edge',
    description: '行内代码内的 $ 不应被解析为 math。',
    markdown: `请看 \`price $99\` 这段代码。`,
    expect: {
      noMathNodes: true,
      inlineMathCount: 0,
      contentIncludes: ['price $99']
    }
  }
];

/**
 * 获取全部用例。
 */
export function getRemarkMathCases(): RemarkMathTestCase[] {
  return REMARK_MATH_CASES;
}
