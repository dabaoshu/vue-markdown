<template>
  <div class="ast-ui-test-page">
    <header class="ast-ui-test-page__header">
      <div class="ast-ui-test-page__intro">
        <h1>remark-gfm 测试用例</h1>
        <p>
          同时校验「解析 AST」与「渲染 UI」。共 {{ cases.length }} 条：
          <strong class="is-pass">{{ passedCount }}</strong> 通过 /
          <strong class="is-fail">{{ failedCount }}</strong> 失败
          <span class="muted">
            （解析失败 {{ parseFailedCount }} · UI 失败 {{ uiFailedCount }}）
          </span>
        </p>
      </div>
      <div class="ast-ui-test-page__actions">
        <button type="button" class="btn" :disabled="uiChecking" @click="rerunAll">
          {{ uiChecking ? '检测中…' : '重新跑全部' }}
        </button>
        <RouterLink class="btn btn--ghost" to="/demo?tab=gfm">打开 Demo GFM Tab</RouterLink>
      </div>
    </header>

    <div class="ast-ui-test-page__body">
      <aside class="ast-ui-test-page__sidebar">
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
            <span class="case-list__status">{{ resultGlyph(results[item.id]) }}</span>
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

      <section v-if="selectedCase" class="ast-ui-test-page__detail">
        <div class="detail-head">
          <div>
            <div class="detail-head__eyebrow">{{ selectedCase.group }} · {{ selectedCase.id }}</div>
            <h2>{{ selectedCase.title }}</h2>
            <p class="detail-head__desc">{{ selectedCase.description }}</p>
          </div>
          <div class="detail-badge" :class="selectedResult?.ok ? 'is-pass' : 'is-fail'">
            {{ selectedResult?.ok ? 'PASS' : 'FAIL' }}
          </div>
        </div>

        <div class="detail-flags">
          <span class="flag">gfm: {{ selectedCase.gfm === false ? 'off' : 'on' }}</span>
          <span class="flag">breaks: {{ selectedCase.breaks ? 'on' : 'off' }}</span>
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
            <div class="panel__head"><span>输入 Markdown</span></div>
            <pre class="panel__code">{{ selectedCase.markdown || '(空文档)' }}</pre>
          </div>
          <div class="panel">
            <div class="panel__head">
              <span>实时预览</span>
              <span class="panel__hint">按本用例 gfm / breaks 渲染</span>
            </div>
            <div class="panel__preview" data-preview="selected">
              <RemarkGfmPreview
                :key="selectedCase.id + '-selected'"
                :source="selectedCase.markdown"
                :gfm="selectedCase.gfm !== false"
                :breaks="Boolean(selectedCase.breaks)"
              />
            </div>
          </div>
        </div>

        <details class="panel panel--ast">
          <summary class="panel__head panel__head--clickable">生效的 UI 期望</summary>
          <pre class="panel__code">{{ resolvedUiJson }}</pre>
        </details>
        <details class="panel panel--ast">
          <summary class="panel__head panel__head--clickable">mdast JSON</summary>
          <pre class="panel__code">{{ selectedAstJson }}</pre>
        </details>
        <details class="panel panel--ast">
          <summary class="panel__head panel__head--clickable">期望断言 expect</summary>
          <pre class="panel__code">{{ expectJson }}</pre>
        </details>
      </section>
    </div>

    <div class="ui-batch" aria-hidden="true">
      <div
        v-for="item in cases"
        :key="item.id + '-batch'"
        class="ui-batch__item"
        :data-case-id="item.id"
      >
        <RemarkGfmPreview
          :source="item.markdown"
          :gfm="item.gfm !== false"
          :breaks="Boolean(item.breaks)"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import RemarkGfmPreview from '@/test/remark-gfm/RemarkGfmPreview';
import {
  REMARK_GFM_CASES,
  assertRemarkGfmUi,
  evaluateRemarkGfmCase,
  mergeUiResult,
  resolveUiExpectation,
  treeToDisplayJson,
  type RemarkGfmCaseGroup,
  type RemarkGfmCaseResult
} from '@/test/remark-gfm';
import '@/test/_shared/ast-ui-test-page.scss';

const GROUP_LABELS: Record<RemarkGfmCaseGroup | 'all', string> = {
  all: '全部',
  table: '表格',
  task: '任务',
  strike: '删除线',
  link: '链接',
  breaks: '换行',
  edge: '边界'
};

const cases = REMARK_GFM_CASES;
const activeGroup = ref<RemarkGfmCaseGroup | 'all'>('all');
const selectedId = ref(cases[0]?.id ?? '');
const results = reactive<Record<string, RemarkGfmCaseResult>>({});
const uiChecking = ref(false);

const filteredCases = computed(() => {
  if (activeGroup.value === 'all') return cases;
  return cases.filter((item) => item.group === activeGroup.value);
});

const groupFilters = computed(() => {
  const counts: Record<string, number> = { all: cases.length };
  for (const item of cases) {
    counts[item.group] = (counts[item.group] || 0) + 1;
  }
  return (Object.keys(GROUP_LABELS) as Array<RemarkGfmCaseGroup | 'all'>).map(
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
function resultGlyph(result?: RemarkGfmCaseResult): string {
  if (!result) return '·';
  return result.ok ? '✓' : '✗';
}

/**
 * 先跑 AST，再等 DOM 批渲染后跑 UI。
 */
async function rerunAll() {
  uiChecking.value = true;
  for (const testCase of cases) {
    results[testCase.id] = evaluateRemarkGfmCase(testCase);
  }

  await nextTick();
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
      assertRemarkGfmUi(host, testCase);
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
