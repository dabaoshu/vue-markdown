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
    id: 'link-html',
    title: 'html 仍是 webpage',
    group: 'link',
    description: 'htm/html 显式归 webpage，并写出 data-http-ext。',
    markdown: '[文档页](https://x.com/index.html)',
    expect: {
      resources: [{ type: 'link', kind: 'webpage', ext: 'html' }]
    }
  },
  {
    id: 'link-xlsx',
    title: '表格文档',
    group: 'link',
    description: 'xlsx → document。',
    markdown: '[报表](https://x.com/report.xlsx)',
    expect: {
      resources: [{ type: 'link', kind: 'document', ext: 'xlsx' }]
    }
  },
  {
    id: 'link-zip',
    title: '压缩包',
    group: 'link',
    description: 'zip → archive。',
    markdown: '[包](https://x.com/file.zip)',
    expect: {
      resources: [{ type: 'link', kind: 'archive', ext: 'zip' }]
    }
  },
  {
    id: 'link-mp3',
    title: '音频链接',
    group: 'link',
    description: 'mp3 → audio。',
    markdown: '[语音](https://x.com/voice.mp3)',
    expect: {
      resources: [{ type: 'link', kind: 'audio', ext: 'mp3' }]
    }
  },
  {
    id: 'link-mp4',
    title: '视频链接',
    group: 'link',
    description: 'mp4 → video。',
    markdown: '[片段](https://x.com/clip.mp4)',
    expect: {
      resources: [{ type: 'link', kind: 'video', ext: 'mp4' }]
    }
  },
  {
    id: 'mix-image-syntax-and-link',
    title: '图片语法与图片链接同时打标',
    group: 'mix',
    description: 'image 节点走 <img>，link+image kind 仍是 <a>。',
    markdown: '![alt](https://x.com/a.png)\n[封面](https://x.com/b.jpg)',
    expect: {
      imageCount: 1,
      linkCount: 1,
      resources: [
        { type: 'image', kind: 'image', ext: 'png' },
        { type: 'link', kind: 'image', ext: 'jpg' }
      ]
    }
  },
  {
    id: 'mix-demo-kinds',
    title: '混排：各 kind + 边界不打标',
    group: 'mix',
    description: '对齐 Demo：图片/文档/压缩包/音视频/网页与相对路径、mailto、行内 code。',
    markdown: `![图](https://x.com/a.png)

[说明书](https://x.com/manual.pdf)

[报表](https://x.com/report.xlsx)

https://x.com/file.zip

[语音](https://x.com/voice.mp3)

[片段](https://x.com/clip.mp4)

[主页](https://x.com/about)

[文档页](https://x.com/index.html)

[本地](./local.png)

[邮箱](mailto:demo@example.com)

\`https://x.com/not-a-link.png\`
`,
    options: { promoteBareUrls: true },
    expect: {
      imageCount: 1,
      linkCount: 9,
      unannotatedLinkCount: 2,
      contentIncludes: ['https://x.com/not-a-link.png'],
      resources: [
        { type: 'image', kind: 'image', ext: 'png' },
        { type: 'link', kind: 'document', ext: 'pdf', urlIncludes: 'manual.pdf' },
        { type: 'link', kind: 'document', ext: 'xlsx', urlIncludes: 'report.xlsx' },
        { type: 'link', kind: 'archive', ext: 'zip', urlIncludes: 'file.zip' },
        { type: 'link', kind: 'audio', ext: 'mp3' },
        { type: 'link', kind: 'video', ext: 'mp4' },
        { type: 'link', kind: 'webpage', ext: null, urlIncludes: '/about' },
        { type: 'link', kind: 'webpage', ext: 'html', urlIncludes: 'index.html' }
      ]
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
    id: 'edge-relative-image',
    title: '相对路径图片语法不打标',
    group: 'edge',
    description: './local.png 保持普通 image。',
    markdown: '![本地](./local.png)',
    expect: {
      imageCount: 1,
      resources: [],
      unannotatedImageCount: 1
    }
  },
  {
    id: 'edge-plugin-off',
    title: '关闭插件不打标',
    group: 'edge',
    description: 'plugin=false 时 https 图片链接保持普通 link。',
    markdown: '[pic](https://x.com/a.png)',
    plugin: false,
    expect: {
      linkCount: 1,
      resources: [],
      unannotatedLinkCount: 1
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
