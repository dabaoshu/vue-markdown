<template>
  <div class="docs-app">
    <header class="docs-header">
      <RouterLink to="/" class="docs-brand">@nnnb/markdown</RouterLink>
      <nav class="docs-nav">
        <RouterLink to="/" class="docs-nav-link" active-class="is-active">
          特性
        </RouterLink>
        <RouterLink to="/demo" class="docs-nav-link" active-class="is-active">
          在线 Demo
        </RouterLink>
        <a
          class="docs-nav-link docs-nav-link--external"
          href="https://github.com/dabaoshu/vue-markdown"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </nav>
    </header>
    <main class="docs-main" :class="{ 'docs-main--wide': isDemoPage }">
      <RouterView />
    </main>
    <footer class="docs-footer">
      <span>MIT License · Vue 3 Markdown 组件库</span>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

/**
 * 文档站点根布局：顶栏导航 + 内容区 + 页脚
 */
const route = useRoute();
const isDemoPage = computed(() => route.name === 'Demo');
</script>

<style scoped>
.docs-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.docs-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  height: 56px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e2e8f0;
}

.docs-brand {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  text-decoration: none;
  letter-spacing: -0.02em;
}

.docs-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.docs-nav-link {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  color: #475569;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

.docs-nav-link:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.docs-nav-link.is-active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}

.docs-nav-link--external::after {
  content: ' ↗';
  font-size: 11px;
  opacity: 0.6;
}

.docs-main {
  flex: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px 48px;
  box-sizing: border-box;
}

.docs-main--wide {
  max-width: none;
  padding: 16px 20px 28px;
}

.docs-footer {
  padding: 20px 24px;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}
</style>
