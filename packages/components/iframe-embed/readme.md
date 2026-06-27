# iframe-embed（通用能力）

## 模块说明

`@nnnb/markdown` 提供的 **框架无关通用 iframe 嵌入能力**，不包含智能体平台业务字段与协议。

分层：

| 目录 | 职责 |
|------|------|
| `core/` | 类型、默认 postMessage 协议常量 |
| `engine/` | URL 拼接、postMessage 工具 |
| `ui/` | 通用 `IframeEmbed` Vue 组件 |

业务封装（`appid` / `token` / GAIXC 协议）见：`packages/simple/src/components/iframeEmbed/readme.md`

## 导入边界

```ts
// 引擎 / 工具 / 类型
import {
  buildIframeUrl,
  DEFAULT_IFRAME_MESSAGE_TYPES,
  type IframeEmbedParams
} from '@nnnb/markdown';

// Vue 组件
import { IframeEmbed } from '@nnnb/markdown/vue-ui';
```

## 通用协议

| 消息 | 默认 type |
|------|-----------|
| 初始化 | `IFRAME_EMBED_INIT` |
| 无感更新 | `IFRAME_EMBED_UPDATE` |

可通过组件 props `initMessageType` / `updateMessageType` 自定义。

## 快速使用

```vue
<template>
  <IframeEmbed
    src="https://example.com/embed"
    :params="{ foo: 'bar' }"
    param-mode="both"
    height="600"
  />
</template>

<script setup lang="ts">
import { IframeEmbed } from '@nnnb/markdown/vue-ui';
</script>
```

## 主要 API

### 组件 Props

见业务 readme 中同名表格；通用组件不含业务字段约束，`params` 为任意键值对象。

### 工具函数

- `buildIframeUrl` / `serializeIframeParams`
- `postIframeInitParams` / `postIframeUpdateParams` / `postIframeParams`
- `isIframeInitMessage` / `isIframeUpdateMessage`

### Expose

- `updateParams()` — 无感更新
- `reload()` — 强制重载
- `sendParams(isUpdate?)`
- `getIframeEl()`
