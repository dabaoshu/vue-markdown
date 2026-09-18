# remark-http-resource 设计

日期：2026-09-17  
状态：待用户确认后进入实现计划

## 背景

`@nnnb/markdown` 当前把 `http(s)://` 当作普通链接或图片语法处理：

- `[文字](url)` / `<https://...>` / GFM 自动链接 → `link`
- `![alt](url)` → `image`
- `defaultUrlTransform` 只做协议白名单，不做资源类型判断

聊天和文档里经常直接贴带扩展名的资源地址（图片、PDF、压缩包、音视频）。接入方需要按类型渲染（图片预览、文件卡片等），但引擎不应绑定具体 UI。

## 目标

新增 **引擎层** 插件 `remark-http-resource`：

1. 对 `http://` / `https://` 绝对地址做资源分类。
2. 只给已有 `link` / `image` 打标，**不改变节点 `type`**（图片链接仍是 `link`，不会变成 `image`）。
3. 默认一套常规分类；支持扩展名表追加/覆盖，以及优先于表的自定义回调（可返回新类型名）。
4. 可选把文本中的裸 `http(s)://` 提升为 `link` 再打标（默认关闭）。
5. 分类纯函数可脱离 AST 单独测试和复用。

## 非目标

- 不实现图片预览、文件卡片、下载条等 UI。
- 不发 HEAD/GET，不按 `Content-Type` 嗅探。
- 不把 `kind: 'image'` 的 `link` 自动改成 `image` 节点。
- 不处理相对路径、`//cdn...` 协议相对、`mailto:`、`www.` 无协议形式。
- 不把业务卡片组件放进 `@nnnb/markdown` 默认入口。

## 包位置与分层

```text
packages/components/remark-http-resource/
  core/
    types.ts          # 类型
    extensions.ts     # 默认扩展名表与合并
    classifyHttpUrl.ts
  engine/
    remarkHttpResource.ts   # 访树 + 可选裸 URL 提升
    promoteBareUrls.ts
  index.ts            # 只导出引擎层
  readme.md
```

默认入口 `@nnnb/markdown` 通过现有 `export *` 模式再导出（与 `remark-think` 相同）。不新增 `ui/`，不从 `vue-ui.ts` 导出任何本插件组件。

管线位置：

```text
remark-gfm（自动链接）
  → remarkHttpResource
    → remark-rehype（带走 data.hProperties）
```

## 公开 API

```ts
import {
  remarkHttpResource,
  classifyHttpUrl,
  DEFAULT_HTTP_RESOURCE_EXTENSIONS,
  type HttpResource,
  type HttpResourceKind,
  type BuiltinHttpResourceKind,
  type HttpResourceOptions,
  type ClassifyContext
} from '@nnnb/markdown';
```

`remarkHttpResource` 是 remark 插件。`classifyHttpUrl` 是纯函数，插件内部只调用它，不复制规则。

## 标记结构

打在 `link` / `image` 上，与现有 `node.data` 合并，不覆盖其它字段。

```ts
type BuiltinHttpResourceKind =
  | 'image'
  | 'document'
  | 'archive'
  | 'audio'
  | 'video'
  | 'webpage';

/** 内置 kind，或自定义回调返回的任意非空字符串 */
type HttpResourceKind = BuiltinHttpResourceKind | (string & {});

type HttpResource = {
  kind: HttpResourceKind;
  /** 小写、无点；pathname 无后缀时为 null */
  ext: string | null;
  /** 原始 href / src */
  url: string;
};
```

写入位置：

- mdast：`node.data.httpResource`
- 透传 HTML：与 `remark-think` 一样把字面量写进 `hProperties`：`data-http-kind`、`data-http-ext`，渲染后 DOM 上就是这两个属性

`ext === null` 时不写 `data-http-ext`。`classifyHttpUrl` 返回 `null` 时不写任何标记、不改节点。

## 默认扩展名表

只看 `new URL(url).pathname` 最后一段的**最后一个**后缀，大小写不敏感。查询参数与 hash 忽略。

| kind | 扩展名 |
| --- | --- |
| `image` | `jpg` `jpeg` `png` `gif` `webp` `bmp` `svg` `avif` |
| `document` | `pdf` `doc` `docx` `xls` `xlsx` `ppt` `pptx` |
| `archive` | `zip` `rar` `7z` `tar` `gz` `tgz` `bz2` |
| `audio` | `mp3` `wav` `flac` `aac` `ogg` `m4a` |
| `video` | `mp4` `webm` `mov` `avi` `mkv` `m4v` |
| `webpage` | `html` `htm`；以及任何未匹配后缀（含无后缀） |

导出为 `DEFAULT_HTTP_RESOURCE_EXTENSIONS: Record<BuiltinHttpResourceKind, readonly string[]>`。`webpage` 的显式表只有 `html` `htm`；无后缀时 `kind` 仍为 `webpage` 且 `ext: null`。

示例：

- `https://cdn.example.com/a.PNG?w=100#x` → `{ kind: 'image', ext: 'png', url }`
- `https://x.com/report.pdf` → `{ kind: 'document', ext: 'pdf', url }`
- `https://x.com/file.jpg.txt` → `{ kind: 'webpage', ext: 'txt', url }`（只认最后一个后缀 `txt`）
- `https://x.com/pkg.tar.gz` → `{ kind: 'archive', ext: 'gz', url }`（只认最后一个后缀，不把 `tar.gz` 当复合扩展名）
- `https://x.com/page` → `{ kind: 'webpage', ext: null, url }`

## 选项

```ts
type ClassifyContext = {
  protocol: 'http:' | 'https:';
  pathname: string;
  ext: string | null;
  url: string;
};

type ClassifyResult =
  | HttpResourceKind
  | Pick<HttpResource, 'kind'> & { ext?: string | null }
  | null
  | undefined;

type HttpResourceOptions = {
  /**
   * 优先于扩展名表。
   * 返回 kind 或对象即采用；返回 null/undefined/空字符串则继续走表。
   */
  classify?: (url: string, ctx: ClassifyContext) => ClassifyResult;
  /**
   * 追加或覆盖默认扩展名（无点或带点均可，内部归一成小写无点）。
   */
  extensions?: Partial<Record<BuiltinHttpResourceKind, string[]>>;
  /**
   * 默认 false。为 true 时把普通 text 中的 http(s) 绝对地址提升为 link 再打标。
   */
  promoteBareUrls?: boolean;
};
```

## 分类算法

`classifyHttpUrl(url: string, options?: HttpResourceOptions): HttpResource | null`

1. `typeof url !== 'string'` 或 trim 后为空 → `null`。
2. `new URL(url)` 失败 → `null`。
3. `protocol` 不是 `http:` / `https:` → `null`。
4. host 为空（例如 `https://`）→ `null`。
5. 从 pathname 取最后一个 `.` 之后的片段作为候选 `ext`（无 `.` 或以 `.` 结尾则为 `null`）。
6. 构造 `ctx`，调用 `options.classify`：
   - 抛错：`console.warn` 后当作未命中，继续第 7 步。
   - 返回空串 / `null` / `undefined`：继续第 7 步。
   - 返回字符串 kind：`{ kind, ext: ctx.ext, url }`。
   - 返回对象：`kind` 必用；`ext` 若提供（含显式 `null`）则用调用方的，否则用 `ctx.ext`。
7. 合并扩展名表（见下），用 `ctx.ext` 查找 kind；找到则返回。
8. `{ kind: 'webpage', ext: ctx.ext, url }`。

扩展名合并：

- 先放默认表，再 overlay `options.extensions`（用户表覆盖同后缀的默认 kind）。
- 用户表内部同一后缀出现在多个 kind：按 `image → document → archive → audio → video → webpage` 保留先声明者，`console.warn` 一次。

插件访树：使用已有依赖 `unist-util-visit`，不新增 npm 包。

- 访问 `link` 与 `image`。
- URL 取 `node.url`；空则跳过。
- 已有 `data.httpResource` 也覆盖写入（保证选项变化后可重跑；单次 parse 只走一遍）。
- 合并 `data` / `hProperties`，不删除其它键。

## 裸 URL 提升（`promoteBareUrls`）

默认关闭。开启后：

- 只处理不在 `link` / `image` / `code` / `inlineCode` / `definition` 内的 `text` 节点。
- 正则匹配 `https?://[^\s<>"'()]+`，再剥掉末尾常见标点 `.,;:!?。，；：！？`。
- 每个匹配包成 `link`（`url` 与子 text 均为该地址），再打标。
- 非匹配文本保持原 `text` 节点。
- 不识别 `www.example.com`、不识别未闭合半截 URL。

未开启时，裸 URL 必须先被 `remark-gfm` 或 CommonMark 自动链接变成 `link`，本插件才打标。

## 错误处理

| 场景 | 行为 |
| --- | --- |
| 非法 URL、非 http(s)、空 href | 不打标、不抛错 |
| 自定义 `classify` 抛错 | warn + 回落扩展名表 |
| 代码块中的 URL | 不提升、已是 code 则不访成 link |
| `[封面](a.png)` | 仍是 `link`，`kind: 'image'` |
| `![alt](a.png)` | 仍是 `image`，同样打标 |

## 测试与演示

引擎可测性以 `classifyHttpUrl` 为主；插件行为用 docs AST+UI 双层验收。

1. **core 用例**（docs CLI 或同目录 helpers 内断言）：默认表、大小写、query/hash、自定义回调覆盖、回调抛错回落、扩展名 overlay、非法协议返回 `null`。
2. **AST+UI** 目录：`packages/docs/src/test/remark-http-resource/`，路由 `/test/remark-http-resource`，脚本 `test:remark-http-resource`。
   - 正向：`link`/`image` 上有 `data.httpResource`，预览根上有 `[data-http-kind]`。
   - 负向：相对路径、mailto、代码块 URL 无该属性。
   - 覆盖 `promoteBareUrls` 开/关各至少一条。
3. **simple Demo Tab**：示例 Markdown 覆盖图片 URL、PDF、无扩展名网页、带 query 的图片；预览仍用默认 `<a>`/`<img>`，可在 AST 或 DOM 属性上看到标记。不内置业务卡片。

框架接入（simple 接线、docs 路由）在实现时单独列出，需用户确认后再改应用层。

## 实现顺序

1. `core` 类型、默认表、`classifyHttpUrl`。
2. `engine` 插件打标；可选 `promoteBareUrls`。
3. 从 `@nnnb/markdown` 再导出。
4. docs AST+UI 测试页与 CLI。
5. 确认后接 simple Demo Tab。
