<template>
  <div class="iframe-child">
    <h2 class="iframe-child__title">iframe 子页面（参数接收演示）</h2>
    <p class="iframe-child__desc">
      本页模拟被嵌入的业务页，会从 URL 查询串与 GAIXC postMessage 协议读取参数。
    </p>

    <section class="iframe-child__section">
      <h3>URL 查询参数</h3>
      <pre class="iframe-child__pre">{{ queryParamsText }}</pre>
    </section>

    <section class="iframe-child__section">
      <h3>postMessage 参数</h3>
      <p v-if="lastUpdateAt" class="iframe-child__meta">
        最近无感更新：{{ lastUpdateAt }}
      </p>
      <pre class="iframe-child__pre">{{ postMessageParamsText }}</pre>
    </section>

    <button type="button" class="iframe-child__btn" @click="() => notifyParentReady()">
      向父页面发送消息
    </button>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { useGaixcIframeChild, type GaixcAgentIframeParams } from '@/components/iframeEmbed';

  const route = useRoute();
  const { postMessageParams, lastUpdateAt, notifyParentReady } = useGaixcIframeChild();

  /** 从 URL 解析到的参数 */
  const queryParams = computed<GaixcAgentIframeParams>(() => {
    const result: GaixcAgentIframeParams = {};
    Object.entries(route.query).forEach(([key, value]) => {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (Array.isArray(value) && value[0]) {
        result[key] = value[0];
      }
    });
    return result;
  });

  const queryParamsText = computed(() =>
    JSON.stringify(queryParams.value, null, 2)
  );

  const postMessageParamsText = computed(() =>
    JSON.stringify(postMessageParams.value, null, 2)
  );
</script>

<style scoped lang="scss">
  .iframe-child {
    min-height: 100vh;
    padding: 20px;
    box-sizing: border-box;
    background: #fff;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  .iframe-child__title {
    margin: 0 0 8px;
    font-size: 18px;
    font-weight: 600;
    color: #0f172a;
  }

  .iframe-child__desc {
    margin: 0 0 20px;
    font-size: 13px;
    line-height: 1.6;
    color: #64748b;
  }

  .iframe-child__section {
    margin-bottom: 16px;

    h3 {
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 600;
      color: #334155;
    }
  }

  .iframe-child__meta {
    margin: 0 0 8px;
    font-size: 12px;
    color: #1677ff;
  }

  .iframe-child__pre {
    margin: 0;
    padding: 12px;
    border-radius: 8px;
    background: #f1f5f9;
    font-size: 12px;
    line-height: 1.5;
    color: #0f172a;
    overflow: auto;
  }

  .iframe-child__btn {
    height: 36px;
    padding: 0 14px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #fff;
    font-size: 13px;
    cursor: pointer;

    &:hover {
      background: #f8fafc;
    }
  }
</style>
