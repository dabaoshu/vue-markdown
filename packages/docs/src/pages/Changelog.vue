<script lang="ts" setup>
import { computed } from 'vue';
import changelogMarkdown from '@repo/CHANGELOG.md?raw';
import { parseChangelog, splitInlineCode } from '@/changelog/parseChangelog';
import type { ChangelogKind } from '@/changelog/types';

/**
 * 更新日志页：根目录 CHANGELOG.md 为唯一源，版式参考 Ant Design changelog-cn
 *（大标题、语义化版本说明、右侧版本锚点、版本号 + 日期胶囊、类型标记条目）。
 */
const source = computed(() =>
  typeof changelogMarkdown === 'string' ? changelogMarkdown : ''
);

const hasContent = computed(() => source.value.trim().length > 0);

const releases = computed(() =>
  hasContent.value ? parseChangelog(source.value) : []
);

/**
 * 类型标记的 emoji 与中文名，对齐 Ant Design 条目观感。
 *
 * @param kind Keep a Changelog 分类
 */
function kindMeta(kind: ChangelogKind): { emoji: string; label: string } {
  switch (kind) {
    case 'added':
      return { emoji: '🆕', label: '新特性' };
    case 'changed':
      return { emoji: '💄', label: '优化' };
    case 'fixed':
      return { emoji: '🐞', label: '修复' };
    case 'removed':
      return { emoji: '🗑', label: '移除' };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
</script>

<template>
  <div class="changelog-page">
    <article class="changelog-page__main">
      <header class="changelog-page__header">
        <h1 class="changelog-page__title">更新日志</h1>
        <p class="changelog-page__lead">
          <code class="changelog-page__pkg">@nnnb/markdown</code>
          遵循
          <a
            class="changelog-page__link"
            href="https://semver.org/lang/zh-CN/"
            target="_blank"
            rel="noopener noreferrer"
          >Semantic Versioning 2.0.0</a>
          语义化版本规范。
        </p>
      </header>

      <section class="changelog-page__cycle" aria-labelledby="changelog-cycle">
        <h2 id="changelog-cycle" class="changelog-page__cycle-title">发布说明</h2>
        <ul class="changelog-page__cycle-list">
          <li>只记录已发布的具体版本号，不列出未发布内容。</li>
          <li>修订号对应兼容修复，次版本对应向下兼容的新能力，主版本含破坏性更新。</li>
          <li>文档站与 playground 的改动不记在这里。</li>
        </ul>
      </section>

      <p v-if="!hasContent" class="changelog-page__error">无法加载更新日志。</p>

      <section
        v-for="release in releases"
        :id="release.id"
        :key="release.id"
        class="changelog-release"
      >
        <h2 class="changelog-release__title">{{ release.label }}</h2>
        <time
          v-if="release.date"
          class="changelog-release__date"
          :datetime="release.date"
        >{{ release.date }}</time>
        <p v-if="release.note" class="changelog-release__note">{{ release.note }}</p>
        <ul v-if="release.items.length" class="changelog-release__list">
          <li
            v-for="(item, index) in release.items"
            :key="`${release.id}-${index}`"
            class="changelog-release__item"
          >
            <span
              class="changelog-release__kind"
              :class="`changelog-release__kind--${item.kind}`"
            >{{ kindMeta(item.kind).emoji }} {{ kindMeta(item.kind).label }}</span>
            <span class="changelog-release__text">
              <template
                v-for="(part, partIndex) in splitInlineCode(item.text)"
                :key="partIndex"
              >
                <code v-if="part.type === 'code'">{{ part.value }}</code>
                <template v-else>{{ part.value }}</template>
              </template>
            </span>
          </li>
        </ul>
      </section>
    </article>

    <nav v-if="releases.length" class="changelog-toc" aria-label="版本目录">
      <a
        v-for="release in releases"
        :key="release.id"
        class="changelog-toc__link"
        :href="`#${release.id}`"
      >{{ release.label }}</a>
    </nav>
  </div>
</template>

<style scoped>
.changelog-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 48px;
  align-items: start;
}

.changelog-page__title {
  margin: 0 0 20px;
  font-size: 38px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: #0f172a;
}

.changelog-page__lead {
  margin: 0 0 28px;
  font-size: 16px;
  color: #475569;
  line-height: 1.7;
}

.changelog-page__pkg,
.changelog-page__cycle-list code,
.changelog-release__text code {
  padding: 1px 6px;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  color: #0f172a;
  background: #f1f5f9;
  border-radius: 4px;
}

.changelog-page__link {
  color: #2563eb;
  text-decoration: none;
}

.changelog-page__link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.changelog-page__cycle {
  padding-bottom: 28px;
  margin-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.changelog-page__cycle-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.changelog-page__cycle-list {
  margin: 0;
  padding-left: 18px;
  color: #475569;
  font-size: 15px;
  line-height: 1.8;
}

.changelog-page__cycle-list li + li {
  margin-top: 4px;
}

.changelog-page__error {
  margin: 24px 0 0;
  font-size: 15px;
  color: #b91c1c;
}

.changelog-release {
  padding: 28px 0 8px;
  scroll-margin-top: 72px;
}

.changelog-release__title {
  margin: 0 0 10px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.changelog-release__date {
  display: inline-block;
  margin: 0 0 16px;
  padding: 2px 8px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 4px;
}

.changelog-release__note {
  margin: 0;
  font-size: 15px;
  color: #64748b;
  line-height: 1.7;
}

.changelog-release__list {
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  color: #0f172a;
  font-size: 15px;
  line-height: 1.75;
}

.changelog-release__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.changelog-release__item + .changelog-release__item {
  margin-top: 10px;
}

.changelog-release__kind {
  display: inline-block;
  flex: 0 0 auto;
  margin: 1px 0 0;
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
  white-space: nowrap;
  border-radius: 4px;
}

.changelog-release__text {
  min-width: 0;
  flex: 1;
}

.changelog-release__kind--added {
  color: #15803d;
  background: #f0fdf4;
}

.changelog-release__kind--changed {
  color: #1d4ed8;
  background: #eff6ff;
}

.changelog-release__kind--fixed {
  color: #b91c1c;
  background: #fef2f2;
}

.changelog-release__kind--removed {
  color: #b45309;
  background: #fffbeb;
}

.changelog-toc {
  position: sticky;
  top: 72px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 16px;
  border-left: 1px solid #e2e8f0;
}

.changelog-toc__link {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: #64748b;
  text-decoration: none;
  line-height: 1.4;
}

.changelog-toc__link:hover {
  color: #2563eb;
}

@media (max-width: 768px) {
  .changelog-page {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .changelog-page__title {
    font-size: 30px;
  }

  .changelog-toc {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    padding: 0 0 8px;
    border-left: none;
    border-bottom: 1px solid #e2e8f0;
  }
}
</style>
