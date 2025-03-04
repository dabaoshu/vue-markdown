# Vue Markdown Custom Tags Component

A Vue component that extends Markdown functionality to support custom HTML-like tags in your markdown content.

## Installation

```bash
npm install @nnnb/markdown
# or
yarn add @nnnb/markdown
```

## Features

- 🚀 Support for custom HTML-like tags in markdown
- 💪 Vue 3 compatible
- 🎨 Fully customizable components
- 📝 Markdown syntax support
- ⚡ High performance

## Basic Usage

```vue
<template>
  <Markdown :source="markdownContent" :customElements="customTags" />
</template>

<script setup>
  import { Markdown } from '@nnnb/markdown';

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

## Props

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

## Advanced Usage

### Custom Components

You can provide custom components to render your custom tags:

```vue
<template>
  <Markdown
    :source="markdownContent"
    :customElements="['think', 'custom']"
    :components="customComponents"
  />
</template>

<script setup>
  import { Markdown } from '@nnnb/markdown';
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

### With Additional Plugins

## TypeScript Support

The package includes TypeScript definitions. You can import types like this:

```typescript
import type { MarkdownProps, MarkdownOptions } from '@nnnb/markdown';
```

## License

[MIT License](LICENSE)
