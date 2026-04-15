# @nnnb/markdown

Vue 3 Markdown渲染组件，支持语法高亮、数学公式和自定义元素。

## 安装

使用 pnpm 安装:




# Vue Markdown and Code Highlighting Components

This package provides Vue components that extend Markdown functionality to support custom HTML-like tags in your markdown content and offers code syntax highlighting capabilities.

## Installation

```bash
npm install @nnnb/markdown
# or
yarn add @nnnb/markdown
# or
pnpm add @nnnb/markdown
```

注意：本组件使用以下依赖作为对等依赖（peerDependencies），你需要在你的项目中安装它们：

```bash
npm add highlight.js lodash
```

如果需要数学公式支持，请额外安装：

```bash
npm add rehype-katex remark-math
```

## Components

This package includes two main components:

1. **Markdown Component**: Renders markdown content with support for custom HTML-like tags and math expressions
2. **Code Highlight Component**: Provides syntax highlighting for code blocks

## Markdown Component

### Features

- 🚀 Support for custom HTML-like tags in markdown
- 🧮 Math expressions support with KaTeX
- 💪 Vue 3 compatible
- 🎨 Fully customizable components
- 📝 Markdown syntax support
- ⚡ High performance

### Basic Usage

```vue
<template>
  <VueMarkdown :source="markdownContent" :customElements="customTags" />
</template>

<script setup>
  import { VueMarkdown } from '@nnnb/markdown';

  const customTags = ['think', 'custom', 'note'];
  const markdownContent = `
# Hello World

<think>
This content will be rendered inside a think component
</think>

<custom>
This is rendered in a custom component
</custom>

<note>
This is a note
</note>
`;
</script>
```

### Props

| Prop Name           | Type     | Required | Description                            |
| ------------------- | -------- | -------- | -------------------------------------- |
| source              | string   | Yes      | Markdown content to be rendered        |
| customElements      | string[] | No       | Array of custom tag names to be parsed |
| components          | Object   | No       | Custom components mapping              |
| allowElement        | Function | No       | Function to filter allowed elements    |
| allowedElements     | string[] | No       | Array of allowed HTML elements         |
| disallowedElements  | string[] | No       | Array of disallowed HTML elements      |
| rehypePlugins       | Array    | No       | Additional rehype plugins              |
| remarkPlugins       | Array    | No       | Additional remark plugins              |
| remarkRehypeOptions | Object   | No       | Options for remark-rehype              |
| skipHtml            | boolean  | No       | Whether to skip HTML parsing           |
| unwrapDisallowed    | boolean  | No       | Whether to unwrap disallowed elements  |
| urlTransform        | Function | No       | Function to transform URLs             |
| math                | Object   | No       | Math rendering options                 |

### Advanced Usage

#### Custom Components

You can provide custom components to render your custom tags:

```vue
<template>
  <VueMarkdown
    :source="markdownContent"
    :customElements="['think', 'custom']"
    :components="customComponents"
  />
</template>

<script setup>
  import { VueMarkdown } from '@nnnb/markdown';
  import ThinkComponent from './components/Think.vue';
  import CustomComponent from './components/Custom.vue';

  const customComponents = {
    think: ThinkComponent,
    custom: CustomComponent
  };

  const markdownContent = `
<think>
This will be rendered using ThinkComponent
</think>

<custom>
This will be rendered using CustomComponent
</custom>
`;
</script>
```

#### Math Expressions Support

The Markdown component supports rendering math expressions using KaTeX:

```vue
<template>
  <VueMarkdown 
    :source="markdownContent" 
    :math="{
      strict: true,
      remarkOptions: {},
      rehypeOptions: {}
    }" 
  />
</template>

<script setup>
  import { VueMarkdown } from '@nnnb/markdown';
  import 'katex/dist/katex.min.css';

  const markdownContent = `
# Math Example

Inline math: $E = mc^2$

Block math:

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$
`;
</script>
```

### With Additional Plugins

## Code Highlight Component

Code highlight is now split into engine layer and UI layer:

- Engine exports (framework-agnostic): `@nnnb/markdown`
- Vue UI exports: `@nnnb/markdown/vue-ui`

### Features

- 🎨 Support for two rendering engines: highlight.js and refractor
- 🌈 Use highlight.js styles or customize your own in refractor mode
- 🔍 Automatic language detection
- 💪 Vue 3 compatible

### Basic Usage with Highlight.js

```vue
<template>
  <CodeHighLight :language="language" :code="code" :autoMatch="false" />
</template>

<script setup>
import { CodeHighLight } from '@nnnb/markdown/vue-ui';
import 'highlight.js/styles/atom-one-dark.css';

const language = 'javascript';
const code = 'const greeting = "Hello World!";';
</script>
```

You can use any highlight.js style by importing the corresponding CSS file.

### Using Refractor Mode

```vue
<template>
  <CodeHighLight 
    generatorType="refractor"
    :language="language" 
    :code="code" 
    :theme="customTheme" 
  />
</template>

<script setup>
import { CodeHighLight } from '@nnnb/markdown/vue-ui';

const language = 'javascript';
const code = 'const greeting = "Hello World!";';
const customTheme = {
  // Your custom theme styles
};
</script>
```

### Engine-only Usage

```ts
import { highlightTohtml, refractorToHtml } from '@nnnb/markdown';
```

### Props

| Prop Name       | Type                        | Default     | Description                              |
| --------------- | --------------------------- | ----------- | ---------------------------------------- |
| generatorType   | 'highlight' \| 'refractor'  | 'highlight' | The syntax highlighting engine to use    |
| code            | string                      | -           | The code to be highlighted               |
| language        | string                      | ''          | The language of the code                 |
| autoMatch       | boolean                     | true        | Whether to auto-detect the language      |
| theme           | Object                      | {}          | Custom theme (for refractor mode only)   |
| ignoreIllegals  | boolean                     | true        | Whether to ignore illegal characters     |

## TypeScript Support

The package includes TypeScript definitions. You can import types like this:

```typescript
import type { MarkdownProps, MarkdownOptions, HighlighterProps } from '@nnnb/markdown';
```

## License

[MIT License](LICENSE)
