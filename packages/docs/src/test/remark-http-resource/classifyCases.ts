import type { HttpResource, HttpResourceOptions } from '../../../../components/remark-http-resource';

/**
 * classifyHttpUrl 数据驱动用例。
 */
export interface ClassifyHttpUrlCase {
  id: string;
  title: string;
  description: string;
  url: unknown;
  options?: HttpResourceOptions;
  expect: HttpResource | null;
  /** 为 true 时断言过程中至少调用一次 console.warn */
  expectWarn?: boolean;
}

export const CLASSIFY_HTTP_URL_CASES: ClassifyHttpUrlCase[] = [
  {
    id: 'image-query-hash-case',
    title: '图片：大写扩展名 + query + hash',
    description: '只看 pathname 最后一个后缀，忽略大小写、query、hash。',
    url: 'https://cdn.example.com/a.PNG?w=100#x',
    expect: {
      kind: 'image',
      ext: 'png',
      url: 'https://cdn.example.com/a.PNG?w=100#x'
    }
  },
  {
    id: 'document-pdf',
    title: '文档：pdf',
    description: 'pdf 归 document。',
    url: 'https://x.com/report.pdf',
    expect: { kind: 'document', ext: 'pdf', url: 'https://x.com/report.pdf' }
  },
  {
    id: 'document-xlsx',
    title: '文档：xlsx',
    description: 'xlsx 归 document。',
    url: 'https://x.com/report.xlsx',
    expect: { kind: 'document', ext: 'xlsx', url: 'https://x.com/report.xlsx' }
  },
  {
    id: 'archive-zip',
    title: '压缩包：zip',
    description: 'zip 归 archive。',
    url: 'https://x.com/file.zip',
    expect: { kind: 'archive', ext: 'zip', url: 'https://x.com/file.zip' }
  },
  {
    id: 'audio-mp3',
    title: '音频：mp3',
    description: 'mp3 归 audio。',
    url: 'https://x.com/voice.mp3',
    expect: { kind: 'audio', ext: 'mp3', url: 'https://x.com/voice.mp3' }
  },
  {
    id: 'video-mp4',
    title: '视频：mp4',
    description: 'mp4 归 video。',
    url: 'https://x.com/clip.mp4',
    expect: { kind: 'video', ext: 'mp4', url: 'https://x.com/clip.mp4' }
  },
  {
    id: 'last-ext-only-txt',
    title: '只认最后一个后缀',
    description: 'file.jpg.txt 的 txt 无默认匹配，kind 为 webpage。',
    url: 'https://x.com/file.jpg.txt',
    expect: { kind: 'webpage', ext: 'txt', url: 'https://x.com/file.jpg.txt' }
  },
  {
    id: 'tar-gz-last-suffix',
    title: 'tar.gz 只认 gz',
    description: '不把 tar.gz 当复合扩展名。',
    url: 'https://x.com/pkg.tar.gz',
    expect: { kind: 'archive', ext: 'gz', url: 'https://x.com/pkg.tar.gz' }
  },
  {
    id: 'webpage-no-ext',
    title: '无后缀为 webpage',
    description: 'pathname 无点时 ext 为 null。',
    url: 'https://x.com/page',
    expect: { kind: 'webpage', ext: null, url: 'https://x.com/page' }
  },
  {
    id: 'webpage-html',
    title: 'html 为 webpage',
    description: 'htm/html 显式归 webpage。',
    url: 'http://x.com/index.HTML',
    expect: { kind: 'webpage', ext: 'html', url: 'http://x.com/index.HTML' }
  },
  {
    id: 'reject-mailto',
    title: '非 http(s) 返回 null',
    description: 'mailto 不分类。',
    url: 'mailto:a@b.com',
    expect: null
  },
  {
    id: 'reject-relative',
    title: '相对路径返回 null',
    description: '无协议不分类。',
    url: '/img/a.png',
    expect: null
  },
  {
    id: 'reject-protocol-relative',
    title: '协议相对返回 null',
    description: '//cdn 不分类。',
    url: '//cdn.example.com/a.png',
    expect: null
  },
  {
    id: 'reject-empty-host',
    title: '空 host 返回 null',
    description: 'https:// 非法或空 host。',
    url: 'https://',
    expect: null
  },
  {
    id: 'reject-blank',
    title: '空字符串返回 null',
    description: 'trim 后为空。',
    url: '   ',
    expect: null
  },
  {
    id: 'custom-kind-string',
    title: '回调返回自定义 kind',
    description: '字符串 kind 覆盖默认表，ext 仍来自 pathname。',
    url: 'https://cdn.example.com/a.png',
    options: { classify: () => 'cdn-image' },
    expect: {
      kind: 'cdn-image',
      ext: 'png',
      url: 'https://cdn.example.com/a.png'
    }
  },
  {
    id: 'custom-object-ext',
    title: '回调对象可改 ext',
    description: '显式 ext:null 必须保留。',
    url: 'https://cdn.example.com/a.png',
    options: { classify: () => ({ kind: 'cdn-image', ext: null }) },
    expect: {
      kind: 'cdn-image',
      ext: null,
      url: 'https://cdn.example.com/a.png'
    }
  },
  {
    id: 'custom-fallthrough',
    title: '回调返回 undefined 走默认表',
    description: '未命中回调则 png 仍是 image。',
    url: 'https://x.com/a.png',
    options: { classify: () => undefined },
    expect: { kind: 'image', ext: 'png', url: 'https://x.com/a.png' }
  },
  {
    id: 'custom-throw-fallback',
    title: '回调抛错回落默认表',
    description: 'warn 后 png 仍按 image。',
    url: 'https://x.com/a.png',
    options: {
      classify: () => {
        throw new Error('boom');
      }
    },
    expect: { kind: 'image', ext: 'png', url: 'https://x.com/a.png' },
    expectWarn: true
  },
  {
    id: 'overlay-heic',
    title: '用户扩展名 overlay',
    description: 'heic 追加到 image。',
    url: 'https://x.com/a.heic',
    options: { extensions: { image: ['heic'] } },
    expect: { kind: 'image', ext: 'heic', url: 'https://x.com/a.heic' }
  },
  {
    id: 'overlay-override-png',
    title: '用户表覆盖默认 kind',
    description: '把 png 改映射到 document。',
    url: 'https://x.com/a.png',
    options: { extensions: { document: ['png'] } },
    expect: { kind: 'document', ext: 'png', url: 'https://x.com/a.png' }
  },
  {
    id: 'overlay-user-conflict',
    title: '用户表内部冲突保留 image',
    description: '同一后缀出现在 image 与 document 时按 kind 顺序保留先声明者。',
    url: 'https://x.com/a.foo',
    options: { extensions: { image: ['foo'], document: ['foo'] } },
    expect: { kind: 'image', ext: 'foo', url: 'https://x.com/a.foo' },
    expectWarn: true
  }
];
