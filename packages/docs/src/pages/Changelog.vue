<script lang="ts" setup>
import { computed } from 'vue';
import {
  MarkdownRenderer,
  type MarkdownFeatures
} from '@nnnb/markdown-ui';
import changelogMarkdown from '@repo/CHANGELOG.md?raw';

/**
 * 更新日志页：渲染仓库根 CHANGELOG.md。
 * 只开 GFM / 换行，避免 DEFAULT_MARKDOWN_FEATURES 全开。
 */
const features: Partial<MarkdownFeatures> = {
  gfm: true,
  breaks: true,
  math: false,
  mermaid: false,
  think: false,
  codeHighlight: false,
  customTags: false,
  elTable: false,
  httpResource: false
};

const source = computed(() =>
  typeof changelogMarkdown === 'string' ? changelogMarkdown : ''
);

const hasContent = computed(() => source.value.trim().length > 0);
</script>

<template>
  <article class="changelog-page">
    <header class="changelog-page__header">
      <h1 class="changelog-page__title">更新日志</h1>
      <p class="changelog-page__lead">记录 `@nnnb/markdown` 的公开发布。</p>
    </header>
    <MarkdownRenderer
      v-if="hasContent"
      class="changelog-page__body"
      :source="source"
      :features="features"
    />
    <p v-else class="changelog-page__error">无法加载更新日志。</p>
  </article>
</template>

<style scoped>
.changelog-page {
  max-width: 760px;
}

.changelog-page__title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.changelog-page__lead {
  margin: 0 0 28px;
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
}

.changelog-page__error {
  margin: 0;
  font-size: 15px;
  color: #b91c1c;
}

.changelog-page__body {
  color: #0f172a;
}
</style>
