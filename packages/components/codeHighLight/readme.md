code-hight-light组件

## 代码高亮

支持两种渲染引擎 highlight 和 refractor
在 highlight 模式下可以快速使用 highlight 的样式
在 refractor 模式下可以自定义渲染样式

默认是highlight模式

## highlight 模式使用

```vue
<template>
  <Highlighter :language="language" :code="code" :autodetect="false" />
</template>

<script>
import { Highlighter } from '@nnnb/vue-markdown';
import 'highlight.js/styles/atom-one-dark.css';
</script>

```
### 支持highlight.js的所有样式 可以通过加载不同的css来改变代码高亮样式
例如 import 'highlight.js/styles/atom-one-dark.css';


## refractor 模式使用

```vue
<template>
  <Highlighter :language="language" :code="code" :autodetect="false" />
</template>

<script>
import { Highlighter } from '@nnnb/vue-markdown';
import 'highlight.js/styles/atom-one-dark.css';
</script>

```
