import type { RemarkGfmTestCase } from './types';

/**
 * remark-gfm / remark-breaks 测试用例。
 * 覆盖：表格、任务列表、删除线、自动链接、换行保留、负向与边界。
 */
export const REMARK_GFM_CASES: RemarkGfmTestCase[] = [
  {
    id: 'table-basic',
    title: '表格：基础两列',
    group: 'table',
    description: '标准 GFM 表格应解析为 table / tableRow / tableCell。',
    markdown: `| 产品 | 库存 |
| --- | ---: |
| 键盘 | 42 |
| 鼠标 | 18 |
`,
    expect: {
      tableCount: 1,
      contentIncludes: ['产品', '键盘', '42', '鼠标']
    }
  },
  {
    id: 'table-with-align',
    title: '表格：对齐标记',
    group: 'table',
    description: '右对齐列仍应产出 table 节点与单元格文本。',
    markdown: `| 名称 | 数量 |
| :--- | ---: |
| A | 1 |
`,
    expect: {
      tableCount: 1,
      contentIncludes: ['名称', 'A', '1']
    }
  },
  {
    id: 'task-checked-unchecked',
    title: '任务列表：已完成与待办',
    group: 'task',
    description: 'listItem.checked 应为 true / false。',
    markdown: `- [x] 已完成项
- [ ] 待办项
`,
    expect: {
      checkedTrueCount: 1,
      checkedFalseCount: 1,
      contentIncludes: ['已完成项', '待办项']
    }
  },
  {
    id: 'strike-double-tilde',
    title: '删除线：双波浪线',
    group: 'strike',
    description: 'singleTilde:false 时 ~~text~~ 解析为 delete。',
    markdown: `普通 **粗体**、*斜体*、~~删除线~~ 混排。`,
    expect: {
      deleteCount: 1,
      contentIncludes: ['删除线', '粗体']
    }
  },
  {
    id: 'strike-single-tilde-ignored',
    title: '删除线：单波浪线不识别',
    group: 'strike',
    description: '关闭 singleTilde 后 ~text~ 不应变成 delete。',
    markdown: `价格 ~99~ 元，真正删除 ~~99~~。`,
    expect: {
      deleteCount: 1,
      contentIncludes: ['99'],
      contentExcludes: []
    }
  },
  {
    id: 'link-autolink',
    title: '自动链接：尖括号 URL',
    group: 'link',
    description: '`<https://example.com>` 应解析为 link。',
    markdown: `访问 <https://example.com> 查看文档。`,
    expect: {
      linkCount: 1,
      contentIncludes: ['https://example.com']
    }
  },
  {
    id: 'breaks-soft-newline',
    title: '换行：单换行保留为 break',
    group: 'breaks',
    description: '启用 remark-breaks 时，段落内单换行变为 break 节点。',
    markdown: `第一行
第二行`,
    gfm: false,
    breaks: true,
    expect: {
      breakCount: 1,
      contentIncludes: ['第一行', '第二行']
    }
  },
  {
    id: 'breaks-with-gfm',
    title: '换行 + GFM 混排',
    group: 'breaks',
    description: '同时开启 gfm 与 breaks，换行与删除线共存。',
    markdown: `aaa
bbb ~~ccc~~`,
    gfm: true,
    breaks: true,
    expect: {
      breakCount: 1,
      deleteCount: 1,
      contentIncludes: ['aaa', 'bbb', 'ccc']
    }
  },
  {
    id: 'edge-no-gfm-table-plaintext',
    title: '负向：关闭 GFM 时表格不解析',
    group: 'edge',
    description: '未启用 remark-gfm 时，管道表格应保持为普通段落文本。',
    markdown: `| A | B |
| --- | --- |
| 1 | 2 |
`,
    gfm: false,
    breaks: false,
    expect: {
      noTable: true,
      tableCount: 0,
      contentIncludes: ['A', 'B']
    }
  },
  {
    id: 'edge-plain-paragraph',
    title: '边界：纯段落无 GFM 节点',
    group: 'edge',
    description: '无表格/任务/删除线时不应误产出对应节点。',
    markdown: `只是一段普通说明文字。`,
    expect: {
      tableCount: 0,
      deleteCount: 0,
      noTable: true,
      noDelete: true,
      contentIncludes: ['普通说明文字']
    }
  },
  {
    id: 'mixed-quote-list',
    title: '混排：引用与有序/无序列表',
    group: 'edge',
    description: '引用块与列表应正常解析，文本可读。',
    markdown: `> 引用块内可以写说明。

1. 有序一
2. 有序二

- 无序 A
- 无序 B
`,
    expect: {
      rootChildTypes: ['blockquote', 'list', 'list'],
      contentIncludes: ['引用块内可以写说明', '有序一', '无序 A']
    }
  }
];

/**
 * 获取全部用例。
 */
export function getRemarkGfmCases(): RemarkGfmTestCase[] {
  return REMARK_GFM_CASES;
}
