# IframeEmbed（Vue 组件）

自包含的 iframe 嵌入组件，支持 URL 查询串与 postMessage 两种参数传递方式。

## 目录结构

```
iframeEmbed/
  IframeEmbed.vue          # 通用组件
  GaixcIframeEmbed.vue     # 智能体平台业务封装（预设 GAIXC 协议）
  types.ts                 # 类型与协议常量
  buildIframeUrl.ts        # URL 参数拼接
  postMessageBridge.ts     # postMessage 工具
  useGaixcIframeChild.ts   # 子页 composable
  index.ts                 # 统一导出
```

## 快速使用（父页面）

```vue
<template>
  <GaixcIframeEmbed
    src="https://your-agent.example.com/chat"
    :params="params"
    param-mode="both"
    target-origin="https://your-agent.example.com"
    height="600"
    @params-updated="onTokenRefreshed"
  />
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import {
  GaixcIframeEmbed,
  type GaixcAgentIframeParams
} from '@/components/iframeEmbed';

const params = reactive<GaixcAgentIframeParams>({
  appid: 'gaixcAgentPlatform',
  token: 'your-token',
  userName: '张三',
  appPic: 'https://example.com/avatar.png',
  chatId: 'chat-001'
});

function onTokenRefreshed(latest: GaixcAgentIframeParams) {
  console.log('无感更新', latest.token);
}
</script>
```

`IframeEmbed` 为兼容别名，等价于 `GaixcIframeEmbed`。

## 通用组件

如需自定义 postMessage 协议，直接使用 `GenericIframeEmbed`：

```vue
<template>
  <GenericIframeEmbed
    src="https://example.com/embed"
    :params="{ foo: 'bar' }"
    init-message-type="MY_INIT"
    update-message-type="MY_UPDATE"
    height="600"
  />
</template>

<script setup lang="ts">
import { GenericIframeEmbed } from '@/components/iframeEmbed';
</script>
```

## 子页面接入

```ts
import { useGaixcIframeChild } from '@/components/iframeEmbed';

const { postMessageParams, lastUpdateAt, notifyParentReady } = useGaixcIframeChild({
  allowedOrigin: 'https://parent.example.com',
  onInit: (params) => console.log('初始化', params),
  onUpdate: (params) => console.log('无感更新', params)
});
```

完整示例子页：`packages/simple/src/iframeEmbed/child.vue`

## 业务参数 `GaixcAgentIframeParams`

| 字段 | 说明 |
|------|------|
| `appid` | 应用 ID |
| `token` | 鉴权 Token |
| `userName` | 用户名 |
| `appPic` | 头像 URL |
| `chatId` | 会话 ID |
| 其它键 | 扩展字段，会一并传递 |

## 业务协议

| 消息 | type 常量 |
|------|-----------|
| 初始化 | `GAIXC_IFRAME_INIT` |
| 无感更新 | `GAIXC_IFRAME_UPDATE` |
| 子页就绪回传 | `GAIXC_IFRAME_CHILD_READY` |

## 无感刷新

修改 `params`（如刷新 `token`）即可，默认 `silentParamUpdate: true`，不会 reload iframe。

```ts
embedRef.value?.updateParams(); // 手动触发
embedRef.value?.reload();       // 强制重载
```

## 本地演示

| 路由 | 说明 |
|------|------|
| `/iframe-embed` | 父页演示 |
| `/iframe-child` | 子页演示 |

```bash
pnpm dev
# http://localhost:8001/iframe-embed
```

## 导出清单

| 导出 | 说明 |
|------|------|
| `GaixcIframeEmbed` | 业务组件（推荐） |
| `IframeEmbed` | 兼容别名 |
| `GenericIframeEmbed` | 通用组件 |
| `useGaixcIframeChild` | 子页 composable |
| `buildIframeUrl` 等 | 工具函数 |
