<script lang="ts" setup>
import { computed, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MarkdownRenderer } from '@nnnb/markdown-ui';
import {
  getSyntaxExample,
  resolveSyntaxId,
  SYNTAX_GROUPS,
  type SyntaxExampleId
} from '@/syntax/syntaxExamples';

/**
 * Markdown 语法速查：左侧目录，右侧源码与渲染对照。
 */
const route = useRoute();
const router = useRouter();

const activeId = computed({
  get: () => resolveSyntaxId(route.query.id),
  set: (id: SyntaxExampleId) => {
    router.replace({ query: { id } });
  }
});

const current = computed(() => getSyntaxExample(activeId.value));

watch(
  () => route.query.id,
  (id) => {
    const resolved = resolveSyntaxId(id);
    if (id !== resolved) {
      router.replace({ query: { id: resolved } });
    }
  },
  { immediate: true }
);

/**
 * 点选示例并滚到对照区顶部。
 *
 * @param id 目标示例
 */
async function selectExample(id: SyntaxExampleId): Promise<void> {
  activeId.value = id;
  await nextTick();
  document.getElementById('syntax-preview')?.scrollIntoView({
    block: 'start',
    behavior: 'smooth'
  });
}
</script>

<template>
  <div class="syntax-page">
    <nav class="syntax-nav" aria-label="语法目录">
      <section
        v-for="group in SYNTAX_GROUPS"
        :key="group.id"
        class="syntax-nav__group"
      >
        <h2 class="syntax-nav__title">{{ group.title }}</h2>
        <ul class="syntax-nav__list">
          <li v-for="item in group.items" :key="item.id">
            <button
              type="button"
              class="syntax-nav__item"
              :class="{ 'is-active': item.id === activeId }"
              :aria-current="item.id === activeId ? 'page' : undefined"
              @click="selectExample(item.id)"
            >
              <span class="syntax-nav__label">{{ item.title }}</span>
              <span class="syntax-nav__hint">{{ item.hint }}</span>
            </button>
          </li>
        </ul>
      </section>
    </nav>

    <article id="syntax-preview" class="syntax-detail">
      <header class="syntax-detail__header">
        <p class="syntax-detail__eyebrow">Markdown 语法</p>
        <h1 class="syntax-detail__title">{{ current.title }}</h1>
        <p class="syntax-detail__lead">
          左侧点选语法，右侧对照源码和
          <code>@nnnb/markdown</code>
          的渲染结果。
        </p>
      </header>

      <div class="syntax-detail__grid">
        <section class="syntax-pane">
          <h2 class="syntax-pane__title">源码</h2>
          <pre class="syntax-pane__source"><code>{{ current.markdown }}</code></pre>
        </section>
        <section class="syntax-pane">
          <h2 class="syntax-pane__title">效果</h2>
          <div class="syntax-pane__preview">
            <MarkdownRenderer
              :source="current.markdown"
              :features="current.features"
            />
          </div>
        </section>
      </div>
    </article>
  </div>
</template>

<style scoped>
.syntax-page {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 16px;
  align-items: start;
  width: 100%;
}

.syntax-nav {
  position: sticky;
  top: 72px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 100px);
  padding: 12px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.syntax-nav__title {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
}

.syntax-nav__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.syntax-nav__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #475569;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.syntax-nav__item:hover {
  background: #f8fafc;
  color: #0f172a;
}

.syntax-nav__item.is-active {
  border-color: #bfdbfe;
  color: #2563eb;
  background: #eff6ff;
  font-weight: 600;
}

.syntax-nav__label {
  font-size: 13px;
  line-height: 1.4;
}

.syntax-nav__hint {
  color: #94a3b8;
  font-family: Consolas, Monaco, monospace;
  font-size: 11px;
  font-weight: 400;
}

.syntax-nav__item.is-active .syntax-nav__hint {
  color: #64748b;
}

.syntax-detail {
  min-width: 0;
  scroll-margin-top: 72px;
}

.syntax-detail__eyebrow {
  margin: 0 0 6px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.syntax-detail__title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.syntax-detail__lead {
  margin: 0 0 20px;
  color: #475569;
  font-size: 15px;
  line-height: 1.7;
}

.syntax-detail__lead code {
  padding: 1px 6px;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  background: #f1f5f9;
  border-radius: 4px;
}

.syntax-detail__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.syntax-pane {
  min-width: 0;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.syntax-pane__title {
  margin: 0 0 12px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.syntax-pane__source {
  margin: 0;
  padding: 12px;
  overflow: auto;
  color: #0f172a;
  background: #f8fafc;
  border-radius: 8px;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.syntax-pane__preview {
  min-height: 120px;
  color: #0f172a;
  line-height: 1.7;
}

@media (max-width: 960px) {
  .syntax-detail__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .syntax-page {
    grid-template-columns: 1fr;
  }

  .syntax-nav {
    position: relative;
    top: 0;
    max-height: none;
    flex-direction: row;
    overflow-x: auto;
  }

  .syntax-nav__group {
    flex: none;
  }

  .syntax-nav__list {
    flex-direction: row;
  }

  .syntax-nav__item {
    width: auto;
    white-space: nowrap;
  }

  .syntax-nav__hint {
    display: none;
  }
}
</style>
