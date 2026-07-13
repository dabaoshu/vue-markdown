<script lang="ts" setup>
import { useRouter } from 'vue-router';
import type { DemoTabId } from '@/demo/demoData';

/**
 * 特性卡片定义
 */
interface FeatureCard {
  id: DemoTabId | string;
  title: string;
  description: string;
  tags: string[];
  snippet: string;
  /** 无对应 Demo Tab 时不显示跳转按钮 */
  demoTab?: DemoTabId;
}

/**
 * 后续迭代规划特性（暂无在线 Demo）
 */
interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  tags: string[];
  snippet?: string;
}

const router = useRouter();

/** 是否已开始预加载 Demo 相关 chunk */
let demoPrefetchStarted = false;

/**
 * 预加载 Demo 页与编辑器 chunk，降低从 Home 跳转时的白屏/卡顿
 */
function prefetchDemoBundle() {
  if (demoPrefetchStarted) return;
  demoPrefetchStarted = true;
  void import('@/pages/Demo.vue');
  void import('@/demo/MarkdownDemoEditor.vue');
}

/** 核心能力展示卡片 */
const features: FeatureCard[] = [
  {
    id: 'gfm',
    demoTab: 'gfm',
    title: 'GFM 与排版',
    description:
      '支持 GitHub Flavored Markdown：任务列表、删除线、表格、自动链接，配合 remark-breaks 保留换行。',
    tags: ['remark-gfm', 'remark-breaks'],
    snippet: `import RemarkGfm from 'remark-gfm';
import RemarkBreaks from 'remark-breaks';

remarkPlugins={[RemarkBreaks, RemarkGfm]}`
  },
  {
    id: 'math',
    demoTab: 'math',
    title: '数学公式',
    description: '行内与块级 LaTeX 公式，基于 remark-math + rehype-katex，可配置 strict 模式。',
    tags: ['remark-math', 'rehype-katex'],
    snippet: `<VueMarkdown
  :source="md"
  :math="{ strict: false }"
/>`
  },
  {
    id: 'code',
    demoTab: 'code',
    title: '代码高亮',
    description:
      'CodeHighLight 组件支持 highlight.js 与 refractor 双引擎，可按语言自动匹配主题。',
    tags: ['CodeHighLight', 'highlight.js'],
    snippet: `import { CodeHighLight } from '@nnnb/markdown/vue-ui';

:components="{ code: CodeHighLight }"`
  },
  {
    id: 'mermaid',
    demoTab: 'mermaid',
    title: 'Mermaid 图表',
    description:
      'rehypeMermaid 插件识别 mermaid 代码块，支持官方 mermaid 与 beautiful-mermaid 双引擎及 meta 覆盖。',
    tags: ['rehypeMermaid', 'MermaidBlock'],
    snippet: `import { rehypeMermaid } from '@nnnb/markdown';

rehypePlugins={[[rehypeMermaid, { engine: 'mermaid' }]]}`
  },
  {
    id: 'think',
    demoTab: 'think',
    title: 'Think 自定义标签',
    description:
      'remarkThink 解析 <think> 等自定义标签，MergeThinkRemark 可将连续块合并为 thinkGroup。',
    tags: ['remarkThink', 'customElements'],
    snippet: `customElements={['think', 'custom']}
components={{ think: ThinkElement }}`
  },
  {
    id: 'table',
    demoTab: 'table',
    title: '表格解析',
    description: 'tableNodeParse 将 GFM 表格 AST 转为结构化数据，便于对接 Element Plus 等 UI 表格。',
    tags: ['tableNodeParse', 'ElTable'],
    snippet: `import { tableNodeParse } from '@nnnb/markdown';

const { columns, data } = tableNodeParse(node);`
  },
  {
    id: 'overview',
    demoTab: 'overview',
    title: '引擎 / UI 分层',
    description:
      'core + engine 与 Vue UI 分离导出：引擎从 @nnnb/markdown，组件从 @nnnb/markdown/vue-ui。',
    tags: ['engine-only', 'tree-shaking'],
    snippet: `import { rehypeMermaid } from '@nnnb/markdown';
import { VueMarkdown } from '@nnnb/markdown/vue-ui';`
  }
];

/** 后续版本规划中的能力 */
const roadmapFeatures: RoadmapFeature[] = [
  {
    id: 'iframe',
    title: 'Iframe 嵌入',
    description:
      '计划在后续版本提供通用 iframe 嵌入组件：URL / postMessage 双通道传参、无感参数更新与业务协议二次封装。当前可在 simple 包内查看预研实现。',
    tags: ['后续迭代', 'IframeEmbed', 'postMessage'],
    snippet: `// 规划 API（尚未纳入 @nnnb/markdown/vue-ui）
<IframeEmbed :src="url" :params="params" />`
  }
];

/**
 * 跳转到 Demo 页并预选 Tab
 * @param tabId 演示 Tab 标识
 */
function openDemo(tabId: DemoTabId) {
  prefetchDemoBundle();
  router.push({ path: '/demo', query: { tab: tabId } });
}

/**
 * 特性卡片是否可跳转 Demo
 * @param feature 特性卡片
 */
function canOpenDemo(feature: FeatureCard): feature is FeatureCard & { demoTab: DemoTabId } {
  return Boolean(feature.demoTab);
}
</script>

<template>
  <div class="home">
    <section class="hero">
      <p class="hero-badge">Vue 3 · TypeScript · Unified</p>
      <h1 class="hero-title">@nnnb/markdown</h1>
      <p class="hero-desc">
        可扩展的 Markdown 渲染组件库：GFM、数学公式、代码高亮、Mermaid 图表、自定义标签，引擎与 UI 分层设计，按需引入。
      </p>
      <div class="hero-actions">
        <RouterLink
          to="/demo"
          class="btn btn--primary"
          @mouseenter="prefetchDemoBundle"
          @focus="prefetchDemoBundle"
        >
          打开在线 Demo
        </RouterLink>
        <a
          class="btn btn--ghost"
          href="https://github.com/dabaoshu/vue-markdown"
          target="_blank"
          rel="noopener noreferrer"
        >
          查看源码
        </a>
      </div>
      <div class="install-box">
        <code>pnpm add @nnnb/markdown highlight.js lodash</code>
      </div>
    </section>

    <section class="features">
      <h2 class="section-title">核心能力</h2>
      <div class="feature-grid">
        <article
          v-for="feature in features"
          :key="feature.id"
          class="feature-card"
          @mouseenter="prefetchDemoBundle"
        >
          <div class="feature-card__tags">
            <span v-for="tag in feature.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <h3 class="feature-card__title">{{ feature.title }}</h3>
          <p class="feature-card__desc">{{ feature.description }}</p>
          <pre class="feature-card__code"><code>{{ feature.snippet }}</code></pre>
          <button
            v-if="canOpenDemo(feature)"
            type="button"
            class="feature-card__link"
            @click="openDemo(feature.demoTab)"
          >
            在 Demo 中体验 →
          </button>
        </article>
      </div>
    </section>

    <section class="roadmap">
      <h2 class="section-title">后续迭代</h2>
      <p class="roadmap-desc">以下能力已在路线图中，将在后续版本纳入正式导出与文档 Demo。</p>
      <div class="feature-grid">
        <article
          v-for="feature in roadmapFeatures"
          :key="feature.id"
          class="feature-card feature-card--roadmap"
        >
          <div class="feature-card__tags">
            <span class="tag tag--roadmap">后续迭代</span>
            <span v-for="tag in feature.tags.filter((t) => t !== '后续迭代')" :key="tag" class="tag">
              {{ tag }}
            </span>
          </div>
          <h3 class="feature-card__title">{{ feature.title }}</h3>
          <p class="feature-card__desc">{{ feature.description }}</p>
          <pre v-if="feature.snippet" class="feature-card__code"><code>{{ feature.snippet }}</code></pre>
        </article>
      </div>
    </section>

    <section class="arch">
      <h2 class="section-title">架构分层</h2>
      <div class="arch-grid">
        <div class="arch-item">
          <strong>core/</strong>
          <span>纯类型、算法、协议</span>
        </div>
        <div class="arch-item">
          <strong>engine/</strong>
          <span>流程编排，无框架绑定</span>
        </div>
        <div class="arch-item">
          <strong>ui/</strong>
          <span>Vue 展示组件</span>
        </div>
        <div class="arch-item">
          <strong>vue-ui.ts</strong>
          <span>UI 独立导出入口</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 24px 0 48px;
}

.hero-badge {
  display: inline-block;
  margin: 0 0 12px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  background: #eff6ff;
  border-radius: 999px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero-title {
  margin: 0 0 16px;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.hero-desc {
  max-width: 640px;
  margin: 0 auto 28px;
  font-size: 17px;
  color: #475569;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: transform 0.15s, box-shadow 0.15s;
}

.btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
}

.btn--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
}

.btn--ghost {
  color: #334155;
  background: #fff;
  border: 1px solid #cbd5e1;
}

.btn--ghost:hover {
  background: #f8fafc;
}

.install-box {
  display: inline-block;
  padding: 12px 20px;
  background: #0f172a;
  border-radius: 8px;
}

.install-box code {
  color: #e2e8f0;
  background: none;
  font-size: 14px;
}

.section-title {
  margin: 0 0 24px;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

.features {
  margin-bottom: 48px;
}

.roadmap {
  margin-bottom: 48px;
}

.roadmap-desc {
  margin: -12px 0 24px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.feature-card {
  display: flex;
  flex-direction: column;
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.feature-card:hover {
  border-color: #bfdbfe;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.feature-card--roadmap {
  background: #fafafa;
  border-style: dashed;
}

.feature-card--roadmap:hover {
  border-color: #cbd5e1;
  box-shadow: none;
}

.feature-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.tag {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 4px;
}

.tag--roadmap {
  color: #7c3aed;
  background: #f5f3ff;
}

.feature-card__title {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.feature-card__desc {
  flex: 1;
  margin: 0 0 12px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
}

.feature-card__code {
  margin: 0 0 16px;
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow-x: auto;
}

.feature-card__code code {
  background: none;
  padding: 0;
  color: #334155;
  white-space: pre;
}

.feature-card__link {
  align-self: flex-start;
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  color: #2563eb;
  background: none;
  border: none;
  cursor: pointer;
}

.feature-card__link:hover {
  text-decoration: underline;
}

.arch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.arch-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.arch-item strong {
  font-size: 15px;
  color: #2563eb;
}

.arch-item span {
  font-size: 13px;
  color: #64748b;
}
</style>
