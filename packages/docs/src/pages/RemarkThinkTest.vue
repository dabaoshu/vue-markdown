<template>
  <div class="think-test-page">
    <header class="think-test-page__header">
      <div class="think-test-page__intro">
        <h1>remark-think 测试用例</h1>
        <p>
          同时校验「解析 AST」与「渲染 UI」。共 {{ cases.length }} 条：
          <strong class="is-pass">{{ passedCount }}</strong> 通过 /
          <strong class="is-fail">{{ failedCount }}</strong> 失败
          <span class="muted">
            （解析失败 {{ parseFailedCount }} · UI 失败 {{ uiFailedCount }}）
          </span>
        </p>
      </div>
      <div class="think-test-page__actions">
        <button type="button" class="btn" :disabled="uiChecking" @click="rerunAll">
          {{ uiChecking ? '检测中…' : '重新跑全部' }}
        </button>
        <RouterLink class="btn btn--ghost" to="/demo?tab=think">打开 Demo Think Tab</RouterLink>
      </div>
    </header>

    <div class="think-test-page__body">
      <aside class="think-test-page__sidebar">
        <div class="filter-row">
          <button
            v-for="item in groupFilters"
            :key="item.value"
            type="button"
            class="chip"
            :class="{ 'is-active': activeGroup === item.value }"
            @click="activeGroup = item.value"
          >
            {{ item.label }}
            <span class="chip__count">{{ item.count }}</span>
          </button>
        </div>

        <ul class="case-list">
          <li
            v-for="item in filteredCases"
            :key="item.id"
            class="case-list__item"
            :class="{
              'is-active': item.id === selectedId,
              'is-pass': results[item.id]?.ok === true,
              'is-fail': results[item.id]?.ok === false
            }"
            @click="selectedId = item.id"
          >
            <span class="case-list__status">
              {{ resultGlyph(results[item.id]) }}
            </span>
            <div class="case-list__meta">
              <div class="case-list__title">{{ item.title }}</div>
              <div class="case-list__id">
                {{ item.id }}
                <span class="case-list__badges">
                  <span :class="results[item.id]?.parseOk ? 'ok' : 'bad'">AST</span>
                  <span
                    :class="
                      results[item.id]?.uiOk === true
                        ? 'ok'
                        : results[item.id]?.uiOk === false
                          ? 'bad'
                          : 'pending'
                    "
                  >UI</span>
                </span>
              </div>
            </div>
          </li>
        </ul>
      </aside>

      <section v-if="selectedCase" class="think-test-page__detail">
        <div class="detail-head">
          <div>
            <div class="detail-head__eyebrow">{{ selectedCase.group }} · {{ selectedCase.id }}</div>
            <h2>{{ selectedCase.title }}</h2>
            <p class="detail-head__desc">{{ selectedCase.description }}</p>
          </div>
          <div
            class="detail-badge"
            :class="selectedResult?.ok ? 'is-pass' : 'is-fail'"
          >
            {{ selectedResult?.ok ? 'PASS' : 'FAIL' }}
          </div>
        </div>

        <div class="detail-flags">
          <span class="flag">tags: {{ (selectedCase.tags || ['think']).join(', ') }}</span>
          <span class="flag">merge: {{ selectedCase.merge ? 'on' : 'off' }}</span>
          <span class="flag" :class="selectedResult?.parseOk ? 'is-pass' : 'is-fail'">
            AST {{ selectedResult?.parseOk ? 'OK' : 'FAIL' }}
          </span>
          <span
            class="flag"
            :class="
              selectedResult?.uiOk === true
                ? 'is-pass'
                : selectedResult?.uiOk === false
                  ? 'is-fail'
                  : ''
            "
          >
            UI
            {{
              selectedResult?.uiOk === true
                ? 'OK'
                : selectedResult?.uiOk === false
                  ? 'FAIL'
                  : '…'
            }}
          </span>
        </div>

        <p v-if="selectedResult?.parseError" class="detail-error">
          AST：{{ selectedResult.parseError }}
        </p>
        <p v-if="selectedResult?.uiError" class="detail-error">
          UI：{{ selectedResult.uiError }}
        </p>

        <div class="detail-grid">
          <div class="panel">
            <div class="panel__head">
              <span>输入 Markdown</span>
            </div>
            <pre class="panel__code">{{ selectedCase.markdown || '(空文档)' }}</pre>
          </div>

          <div class="panel">
            <div class="panel__head">
              <span>实时预览</span>
              <span class="panel__hint">按本用例 tags / merge 渲染</span>
            </div>
            <div ref="selectedPreviewRef" class="panel__preview" data-preview="selected">
              <RemarkThinkPreview
                :key="selectedCase.id + '-selected'"
                :source="selectedCase.markdown"
                :tags="selectedCase.tags || ['think']"
                :merge="Boolean(selectedCase.merge)"
              />
            </div>
          </div>
        </div>

        <details class="panel panel--ast">
          <summary class="panel__head panel__head--clickable">
            生效的 UI 期望（默认推导 + 用例覆盖）
          </summary>
          <pre class="panel__code">{{ resolvedUiJson }}</pre>
        </details>

        <details class="panel panel--ast">
          <summary class="panel__head panel__head--clickable">
            mdast JSON（已去掉 position）
          </summary>
          <pre class="panel__code">{{ selectedAstJson }}</pre>
        </details>

        <details class="panel panel--ast">
          <summary class="panel__head panel__head--clickable">
            期望断言 expect
          </summary>
          <pre class="panel__code">{{ expectJson }}</pre>
        </details>
      </section>
    </div>

    <!-- 隐藏批跑容器：对全部用例做真实 DOM UI 检测 -->
    <div class="ui-batch" aria-hidden="true">
      <div
        v-for="item in cases"
        :key="item.id + '-batch'"
        class="ui-batch__item"
        :data-case-id="item.id"
      >
        <RemarkThinkPreview
          :source="item.markdown"
          :tags="item.tags || ['think']"
          :merge="Boolean(item.merge)"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import RemarkThinkPreview from '@/test/remark-think/RemarkThinkPreview';
import {
  REMARK_THINK_CASES,
  assertRemarkThinkUi,
  evaluateRemarkThinkCase,
  mergeUiResult,
  resolveUiExpectation,
  treeToDisplayJson,
  type RemarkThinkCaseGroup,
  type RemarkThinkCaseResult
} from '@/test/remark-think';

const GROUP_LABELS: Record<RemarkThinkCaseGroup | 'all', string> = {
  all: '全部',
  block: '块级',
  inline: '行内',
  merge: '合并',
  'multi-tag': '多标签',
  mixed: '混排',
  edge: '边界'
};

const cases = REMARK_THINK_CASES;
const activeGroup = ref<RemarkThinkCaseGroup | 'all'>('all');
const selectedId = ref(cases[0]?.id ?? '');
const results = reactive<Record<string, RemarkThinkCaseResult>>({});
const uiChecking = ref(false);
const selectedPreviewRef = ref<HTMLElement | null>(null);

const filteredCases = computed(() => {
  if (activeGroup.value === 'all') return cases;
  return cases.filter((item) => item.group === activeGroup.value);
});

const groupFilters = computed(() => {
  const counts: Record<string, number> = { all: cases.length };
  for (const item of cases) {
    counts[item.group] = (counts[item.group] || 0) + 1;
  }
  return (Object.keys(GROUP_LABELS) as Array<RemarkThinkCaseGroup | 'all'>).map(
    (value) => ({
      value,
      label: GROUP_LABELS[value],
      count: counts[value] || 0
    })
  );
});

const selectedCase = computed(
  () => cases.find((item) => item.id === selectedId.value) ?? null
);

const selectedResult = computed(() =>
  selectedCase.value ? results[selectedCase.value.id] : undefined
);

const selectedAstJson = computed(() =>
  treeToDisplayJson(selectedResult.value?.tree ?? null)
);

const expectJson = computed(() =>
  JSON.stringify(selectedCase.value?.expect ?? {}, null, 2)
);

const resolvedUiJson = computed(() =>
  selectedCase.value
    ? JSON.stringify(resolveUiExpectation(selectedCase.value), null, 2)
    : '{}'
);

const passedCount = computed(
  () => Object.values(results).filter((item) => item.ok).length
);
const failedCount = computed(
  () => Object.values(results).filter((item) => item && !item.ok).length
);
const parseFailedCount = computed(
  () => Object.values(results).filter((item) => item && !item.parseOk).length
);
const uiFailedCount = computed(
  () => Object.values(results).filter((item) => item?.uiOk === false).length
);

/**
 * @param result 用例结果
 */
function resultGlyph(result?: RemarkThinkCaseResult): string {
  if (!result) return '·';
  if (result.ok) return '✓';
  return '✗';
}

/**
 * 先跑 AST，再等 DOM 批渲染后跑 UI。
 */
async function rerunAll() {
  uiChecking.value = true;
  for (const testCase of cases) {
    results[testCase.id] = evaluateRemarkThinkCase(testCase);
  }

  await nextTick();
  // 再等一帧，确保 VueMarkdown 完成挂载
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await nextTick();

  for (const testCase of cases) {
    const host = document.querySelector(
      `.ui-batch__item[data-case-id="${testCase.id}"]`
    );
    const parseResult = results[testCase.id];
    if (!host) {
      results[testCase.id] = mergeUiResult(
        parseResult,
        `[${testCase.id}] 未找到批跑预览 DOM`
      );
      continue;
    }

    try {
      assertRemarkThinkUi(host, testCase);
      results[testCase.id] = mergeUiResult(parseResult, null);
    } catch (error) {
      results[testCase.id] = mergeUiResult(
        parseResult,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  uiChecking.value = false;
}

watch(
  filteredCases,
  (list) => {
    if (!list.some((item) => item.id === selectedId.value) && list[0]) {
      selectedId.value = list[0].id;
    }
  },
  { immediate: true }
);

void rerunAll();
</script>

<style scoped>
.think-test-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: calc(100vh - 140px);
}

.think-test-page__header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.think-test-page__intro h1 {
  margin: 0 0 6px;
  font-size: 24px;
  letter-spacing: -0.02em;
}

.think-test-page__intro p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.muted {
  color: #94a3b8;
}

.is-pass {
  color: #15803d;
}

.is-fail {
  color: #b91c1c;
}

.think-test-page__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #2563eb;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.btn--ghost {
  background: #fff;
  color: #2563eb;
}

.think-test-page__body {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.think-test-page__sidebar,
.think-test-page__detail,
.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.think-test-page__sidebar {
  position: sticky;
  top: 72px;
  max-height: calc(100vh - 100px);
  overflow: auto;
  padding: 12px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.chip.is-active {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
  font-weight: 600;
}

.chip__count {
  opacity: 0.7;
}

.case-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.case-list__item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}

.case-list__item:hover {
  background: #f8fafc;
}

.case-list__item.is-active {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.case-list__status {
  width: 16px;
  font-weight: 700;
  line-height: 1.4;
}

.case-list__item.is-pass .case-list__status {
  color: #16a34a;
}

.case-list__item.is-fail .case-list__status {
  color: #dc2626;
}

.case-list__title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.case-list__id {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 11px;
  color: #94a3b8;
  font-family: Consolas, Monaco, monospace;
}

.case-list__badges {
  display: inline-flex;
  gap: 4px;
}

.case-list__badges span {
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
}

.case-list__badges .ok {
  background: #dcfce7;
  color: #166534;
}

.case-list__badges .bad {
  background: #fee2e2;
  color: #991b1b;
}

.case-list__badges .pending {
  background: #f1f5f9;
  color: #64748b;
}

.think-test-page__detail {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.detail-head h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.detail-head__eyebrow {
  font-size: 12px;
  color: #94a3b8;
  font-family: Consolas, Monaco, monospace;
  margin-bottom: 4px;
}

.detail-head__desc {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.detail-badge {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.detail-badge.is-pass {
  background: #dcfce7;
  color: #166534;
}

.detail-badge.is-fail {
  background: #fee2e2;
  color: #991b1b;
}

.detail-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.flag {
  font-size: 12px;
  background: #f1f5f9;
  color: #475569;
  border-radius: 6px;
  padding: 4px 8px;
  font-family: Consolas, Monaco, monospace;
}

.flag.is-pass {
  background: #dcfce7;
  color: #166534;
}

.flag.is-fail {
  background: #fee2e2;
  color: #991b1b;
}

.detail-error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fef2f2;
  color: #991b1b;
  font-size: 13px;
  white-space: pre-wrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.panel {
  overflow: hidden;
}

.panel__head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  background: #f8fafc;
}

.panel__head--clickable {
  cursor: pointer;
  list-style: none;
}

.panel__head--clickable::-webkit-details-marker {
  display: none;
}

.panel__hint {
  font-size: 11px;
  font-weight: 400;
  color: #94a3b8;
}

.panel__code {
  margin: 0;
  padding: 12px;
  max-height: 360px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  background: #0f172a;
  color: #e2e8f0;
  white-space: pre-wrap;
  word-break: break-word;
}

.panel__preview {
  padding: 14px;
  min-height: 120px;
  max-height: 360px;
  overflow: auto;
}

.panel--ast {
  background: #fff;
}

.ui-batch {
  position: absolute;
  left: -10000px;
  top: 0;
  width: 800px;
  pointer-events: none;
  opacity: 0;
}

.ui-batch__item {
  margin-bottom: 8px;
}

@media (max-width: 960px) {
  .think-test-page__body,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .think-test-page__sidebar {
    position: static;
    max-height: 320px;
  }
}
</style>
