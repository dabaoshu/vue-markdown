# remark-http-resource

`remark-http-resource` 用于对 Markdown AST 中已有的 `http://` / `https://` 绝对地址（`link` / `image`）做资源类型分类，并在节点上写入可透传到 HTML 的标记。插件**不改变节点 `type`**，也不绑定具体 UI。

## 目录分层

- `core/`：纯类型、默认扩展名表与分类算法
  - `types.ts`：`HttpResource`、`HttpResourceOptions` 等类型
  - `extensions.ts`：`DEFAULT_HTTP_RESOURCE_EXTENSIONS` 与扩展名合并
  - `classifyHttpUrl.ts`：可独立测试的纯函数分类器
- `engine/`：AST 访树与可选裸 URL 提升
  - `remarkHttpResource.ts`：remark 插件入口
  - `promoteBareUrls.ts`：`promoteBareUrls: true` 时的文本内 URL 提升

## 默认导出边界

`index.ts` 默认只导出引擎层能力与类型：

- `remarkHttpResource`
- `classifyHttpUrl`
- `DEFAULT_HTTP_RESOURCE_EXTENSIONS`
- 相关类型与辅助函数

> 说明：该边界用于避免将 UI 或框架层能力混入默认入口。本插件无 `ui/` 目录，也不从 `vue-ui.ts` 导出。

## 管线位置

本插件应放在 **`remark-gfm` 之后**，以便 GFM 自动链接已先把裸 URL 转成 `link` 节点：

```text
remark-gfm（自动链接）
  → remarkHttpResource
    → remark-rehype（带走 data.hProperties）
```

若开启 `promoteBareUrls: true`，插件会自行把普通 `text` 中的 `http(s)://` 提升为 `link` 再打标；未开启时，裸 URL 须先由 `remark-gfm` 或 CommonMark 自动链接处理。

## 使用示例

```ts
import { remarkHttpResource } from '@nnnb/markdown';

const plugins = [
  [remarkHttpResource, {
    promoteBareUrls: false,
    extensions: { image: ['heic'] },
    classify: (url, ctx) => {
      if (url.includes('cdn.example.com') && ctx.ext === 'png') {
        return 'cdn-image';
      }
      return undefined;
    }
  }]
];
```

## 配置说明

### HttpResourceOptions

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `classify` | `(url, ctx) => ClassifyResult` | — | 优先于扩展名表。返回 kind 或对象即采用；返回 `null` / `undefined` / 空字符串则继续走表。抛错时 `console.warn` 后回落扩展名表。 |
| `extensions` | `Partial<Record<BuiltinHttpResourceKind, string[]>>` | — | 追加或覆盖默认扩展名（无点或带点均可，内部归一成小写无点）。 |
| `promoteBareUrls` | `boolean` | `false` | 为 `true` 时把普通 `text` 中的 `http(s)` 绝对地址提升为 `link` 再打标。 |

### ClassifyContext

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `protocol` | `'http:' \| 'https:'` | URL 协议 |
| `pathname` | `string` | pathname |
| `ext` | `string \| null` | 从 pathname 解析的小写无点后缀；无后缀时为 `null` |
| `url` | `string` | trim 后的原始 URL |

### 内置资源类型（BuiltinHttpResourceKind）

| kind | 默认扩展名 |
| --- | --- |
| `image` | `jpg` `jpeg` `png` `gif` `webp` `bmp` `svg` `avif` |
| `document` | `pdf` `doc` `docx` `xls` `xlsx` `ppt` `pptx` |
| `archive` | `zip` `rar` `7z` `tar` `gz` `tgz` `bz2` |
| `audio` | `mp3` `wav` `flac` `aac` `ogg` `m4a` |
| `video` | `mp4` `webm` `mov` `avi` `mkv` `m4v` |
| `webpage` | `html` `htm`；以及任何未匹配后缀（含无后缀） |

完整默认表见导出的 `DEFAULT_HTTP_RESOURCE_EXTENSIONS`。

## 标记字段

分类命中后，标记写入 `link` / `image` 节点，与现有 `node.data` 合并，不覆盖其它键：

| 位置 | 字段 | 说明 |
| --- | --- | --- |
| mdast | `node.data.httpResource` | `{ kind, ext, url }` 完整分类结果 |
| HTML 透传 | `data-http-kind` | 资源类型（内置或自定义 kind） |
| HTML 透传 | `data-http-ext` | 小写无点后缀；`ext === null` 时不写入 |

`classifyHttpUrl` 返回 `null` 时不写任何标记、不改节点。

## 设计约束

- 引擎层不依赖 Vue/React 等框架运行时。
- 只处理 `http://` / `https://` 绝对地址；相对路径、`mailto:`、`www.` 无协议形式不在范围内。
- 不发 HEAD/GET，不按 `Content-Type` 嗅探；仅依据 URL pathname 后缀与自定义回调分类。
- `[封面](a.png)` 仍是 `link`（`kind: 'image'`）；`![alt](a.png)` 仍是 `image`。
