# codeHighLight

## 代码高亮模块说明

`codeHighLight` 已按 engine-only 规则拆分：

- `core/`：类型与纯函数（如 `escapeHtml`）
- `engine/`：无框架的高亮编排能力（`highlightTohtml`、`refractorToHtml`）
- `ui/`：Vue 组件与样式（`CodeHighLight`、`codeLight`）

## 导入规则

- 引擎能力从默认入口导入：`@nnnb/markdown`
- Vue UI 能力从 UI 入口导入：`@nnnb/markdown/vue-ui`

## 安装依赖

`@nnnb/markdown` 的代码高亮功能依赖以下包（作为 peerDependencies）：

```bash
pnpm add highlight.js refractor vue
```

## 默认样式（内置）

`CodeHighLight` 组件会**自动侧效加载**内置主题 `ui/styles/codeLight.scss`（VS Code Dark+ 风格，匹配 highlight.js 的 `.hljs-*` 类名）。

使用组件时**无需**再手动 `import` 一份 scss/css：

```vue
<script setup lang="ts">
import { CodeHighLight } from '@nnnb/markdown/vue-ui';
// 默认主题已随 CodeHighLight 打包链路注入，无需 import './codeLight.scss'
</script>
```

若仅使用引擎函数 `highlightTohtml`、不渲染 `CodeHighLight` 组件，可单独引入样式：

```ts
import '@nnnb/markdown/codeHighLight/ui/style';
```

构建产物中也可使用编译后的 CSS（`pnpm build` 后路径与源码目录一致）：

```ts
import '@nnnb/markdown/dist/es/codeHighLight/ui/styles/codeLight.css';
// 其它模块示例：
// import '@nnnb/markdown/dist/es/markdown/markdown.module.css';
```

多模块样式会分别输出到 `dist/es/<模块路径>/<文件名>.css`，不会全部堆在根目录 `style.css`。

如需官方 highlight.js 主题，仍可覆盖为：

```ts
import 'highlight.js/styles/github.css';
```

## UI 组件（highlight 模式）

```vue
<template>
  <CodeHighLight :language="language" :code="code" :autoMatch="false" />
</template>

<script setup lang="ts">
import { CodeHighLight } from '@nnnb/markdown/vue-ui';

const language = 'typescript';
const code = 'const msg = "hello";';
</script>
```

不再强制引入 `highlight.js/styles/*.css`；内置主题为 Dark+ 风格。

## UI 组件（refractor 模式）

```vue
<template>
  <CodeHighLight
    generatorType="refractor"
    :language="language"
    :code="code"
    :theme="theme"
  />
</template>

<script setup lang="ts">
import { CodeHighLight } from '@nnnb/markdown/vue-ui';

const language = 'typescript';
const code = 'const msg = "hello";';
const theme = {};
</script>
```

## CodeHighLight Props

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `generatorType` | `'highlight' \| 'refractor'` | `'highlight'` | 渲染引擎 |
| `code` | `string` | - | 代码内容 |
| `language` | `string` | `''` | 语言名 |
| `autoMatch` | `boolean` | `true` | 是否自动识别语言 |
| `ignoreIllegals` | `boolean` | `true` | highlight 模式下忽略非法语法 |
| `theme` | `Record<string, unknown>` | `{}` | refractor 模式主题对象（预留） |

## 引擎能力示例

```ts
import { highlightTohtml } from '@nnnb/markdown';

const html = highlightTohtml('const a = 1', {
  language: 'typescript',
  autoMatch: false,
  ignoreIllegals: true
});
```

## 引擎 API

### `highlightTohtml(code, options)`

使用 `highlight.js` 生成 HTML 字符串：

- `code`: 代码文本
- `options.language`: 指定语言
- `options.autoMatch`: 是否自动识别
- `options.ignoreIllegals`: 是否忽略非法语法

### `refractorToHtml(code, options)`

使用 `refractor` 生成 HTML 字符串：

- `code`: 代码文本
- `options.language`: 指定语言（必填）
- `options.theme`: 主题对象（当前仅透传）

## 迁移说明

- 旧用法（不推荐）：从 `@nnnb/markdown` 直接导入 `CodeHighLight`
- 新用法（推荐）：从 `@nnnb/markdown/vue-ui` 导入 `CodeHighLight`
- 旧深层路径文件仍保留兼容导出，但建议逐步迁移到新入口
