<template>
  <div class="feature-panel">
    <div class="feature-panel__head">
      <button
        type="button"
        class="feature-panel__toggle"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <span class="feature-panel__title">特性配置</span>
        <span v-if="!isDefault" class="feature-panel__badge">已自定义</span>
        <span class="feature-panel__chevron" :class="{ 'is-open': expanded }">▾</span>
      </button>
      <div class="feature-panel__actions">
        <button
          type="button"
          class="feature-panel__reset"
          :class="{ 'is-active': sampleOpen }"
          title="查看与当前开关一致的接入代码"
          @click="sampleOpen = !sampleOpen"
        >
          示例代码
        </button>
        <button
          type="button"
          class="feature-panel__reset"
          :disabled="isDefault"
          title="恢复为当前示例推荐配置"
          @click="emit('reset')"
        >
          恢复默认
        </button>
      </div>
    </div>

    <div v-show="expanded" class="feature-panel__body">
      <label
        v-for="item in WORKBENCH_FEATURE_TOGGLES"
        :key="item.key"
        class="feature-switch"
        :title="item.hint"
      >
        <ElSwitch
          :model-value="modelValue[item.key]"
          size="small"
          @update:model-value="(value: string | number | boolean) => updateFeature(item.key, Boolean(value))"
        />
        <span class="feature-switch__label">{{ item.label }}</span>
      </label>
    </div>

    <div v-show="sampleOpen" class="feature-sample">
      <div class="feature-sample__meta">
        <span class="feature-sample__meta-label">当前开关</span>
        <span v-if="!enabledChips.length" class="status-badge">无额外插件</span>
        <span
          v-for="label in enabledChips"
          :key="label"
          class="status-badge status-badge--on"
        >{{ label }}</span>
      </div>
      <div class="feature-sample__grid">
        <article
          v-for="block in sampleBlocks"
          :key="block.id"
          class="feature-sample__block"
        >
          <div class="feature-sample__bar">
            <div class="feature-sample__bar-main">
              <span class="feature-sample__lang">{{ block.lang }}</span>
              <span class="feature-sample__title">{{ block.title }}</span>
            </div>
            <button
              type="button"
              class="feature-sample__copy"
              :class="{ 'is-copied': copiedId === block.id }"
              :title="`复制 ${block.title}`"
              @click="copySnippet(block.id, block.code)"
            >
              {{ copiedId === block.id ? '已复制' : '复制' }}
            </button>
          </div>
          <pre class="feature-sample__code"><code>{{ block.code }}</code></pre>
        </article>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { ElMessage, ElSwitch } from 'element-plus';
import type { MarkdownFeatures } from '../../index';
import { WORKBENCH_FEATURE_TOGGLES } from './featureToggles';
import {
  buildRendererSnippet,
  buildVueMarkdownSnippet,
  listEnabledFeatureLabels
} from './usageSnippet';

const props = defineProps<{
  modelValue: MarkdownFeatures;
  isDefault: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: MarkdownFeatures];
  reset: [];
}>();

const sampleOpen = defineModel<boolean>('sampleOpen', { default: false });
const expanded = ref(true);
const copiedId = ref<string | null>(null);
let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

const enabledChips = computed(() => listEnabledFeatureLabels(props.modelValue));

const sampleBlocks = computed(() => [
  {
    id: 'renderer',
    lang: 'vue',
    title: '封装组件 · MarkdownRenderer',
    code: buildRendererSnippet(props.modelValue)
  },
  {
    id: 'vue-markdown',
    lang: 'vue',
    title: '按需接入 · VueMarkdown',
    code: buildVueMarkdownSnippet(props.modelValue)
  }
]);

/**
 * 更新单个特性开关。
 * @param key 特性键
 * @param value 开关值
 */
function updateFeature(key: keyof MarkdownFeatures, value: boolean): void {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  });
}

/**
 * 复制接入样例到剪贴板。
 * @param id 样例块标识
 * @param code 样例源码
 */
async function copySnippet(id: string, code: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(code);
    copiedId.value = id;
    clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      copiedId.value = null;
    }, 2000);
    ElMessage.success('示例代码已复制');
  } catch {
    ElMessage.error('复制失败，请手动选择复制');
  }
}
</script>
