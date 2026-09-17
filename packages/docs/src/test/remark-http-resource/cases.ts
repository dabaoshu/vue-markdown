import type { RemarkHttpResourceTestCase } from './types';

export const REMARK_HTTP_RESOURCE_CASES: RemarkHttpResourceTestCase[] = [
  {
    id: 'link-image-ext',
    title: 'Markdown 链接：图片扩展名',
    group: 'link',
    description: '仍是 link，kind 为 image；带 query。',
    markdown: '[pic](https://cdn.example.com/a.PNG?w=100)',
    expect: {
      linkCount: 1,
      imageCount: 0,
      resources: [
        {
          type: 'link',
          kind: 'image',
          ext: 'png',
          urlIncludes: 'a.PNG?w=100'
        }
      ],
      contentIncludes: ['pic']
    }
  },
  {
    id: 'image-syntax',
    title: '图片语法同样打标',
    group: 'image',
    description: 'type 仍是 image。',
    markdown: '![alt](https://x.com/photo.webp)',
    expect: {
      imageCount: 1,
      resources: [{ type: 'image', kind: 'image', ext: 'webp' }]
    }
  },
  {
    id: 'link-pdf',
    title: '文档链接',
    group: 'link',
    description: 'pdf → document。',
    markdown: '[报告](https://x.com/report.pdf)',
    expect: {
      resources: [{ type: 'link', kind: 'document', ext: 'pdf' }]
    }
  },
  {
    id: 'link-webpage',
    title: '无扩展名网页',
    group: 'link',
    description: 'ext 为 null，不写 data-http-ext。',
    markdown: '[页](https://x.com/page)',
    expect: {
      resources: [{ type: 'link', kind: 'webpage', ext: null }]
    }
  },
  {
    id: 'edge-relative',
    title: '相对路径不打标',
    group: 'edge',
    description: '/img/a.png 保持普通 link。',
    markdown: '[rel](/img/a.png)',
    expect: {
      linkCount: 1,
      resources: [],
      unannotatedLinkCount: 1
    }
  },
  {
    id: 'edge-mailto',
    title: 'mailto 不打标',
    group: 'edge',
    description: '非 http(s)。',
    markdown: '[mail](mailto:a@b.com)',
    expect: {
      linkCount: 1,
      resources: [],
      unannotatedLinkCount: 1
    }
  },
  {
    id: 'edge-inline-code',
    title: '行内代码中的 URL 不提升也不打标',
    group: 'edge',
    description: 'inlineCode 保持文本。',
    markdown: '见 `https://x.com/a.png`',
    expect: {
      linkCount: 0,
      resources: [],
      contentIncludes: ['https://x.com/a.png']
    }
  },
  {
    id: 'promote-off-bare',
    title: '默认不提升裸 URL',
    group: 'promote',
    description: '关闭 gfm 且 promoteBareUrls 默认 false 时仍是文本。',
    markdown: '见 https://x.com/a.png',
    gfm: false,
    expect: {
      linkCount: 0,
      resources: [],
      contentIncludes: ['https://x.com/a.png']
    }
  },
  {
    id: 'promote-on-bare',
    title: '开启后提升裸 URL',
    group: 'promote',
    description: 'text 中的 https 图片地址变成 link 且 kind=image。',
    markdown: '见 https://x.com/a.png 结尾。',
    gfm: false,
    options: { promoteBareUrls: true },
    expect: {
      linkCount: 1,
      resources: [{ type: 'link', kind: 'image', ext: 'png', urlIncludes: 'https://x.com/a.png' }],
      contentIncludes: ['见', '结尾']
    }
  },
  {
    id: 'promote-strip-punct',
    title: '提升时剥掉末尾标点',
    group: 'promote',
    description: '句号不进入 url。',
    markdown: '打开 https://x.com/a.png。',
    gfm: false,
    options: { promoteBareUrls: true },
    expect: {
      resources: [{ type: 'link', kind: 'image', ext: 'png', urlIncludes: 'https://x.com/a.png' }],
      contentIncludes: ['。']
    }
  },
  {
    id: 'promote-skip-existing-link',
    title: '已是链接的不再拆一次',
    group: 'promote',
    description: 'markdown 链接内部 text 不二次提升。',
    markdown: '[封面](https://x.com/a.png)',
    gfm: false,
    options: { promoteBareUrls: true },
    expect: {
      linkCount: 1,
      resources: [{ type: 'link', kind: 'image', ext: 'png' }]
    }
  }
];
