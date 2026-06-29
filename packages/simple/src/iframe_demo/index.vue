<template>
  <div class="iframe-demo">
    <h2 class="iframe-demo__title">IframeEmbed 组件演示</h2>
    <p class="iframe-demo__desc">
      向 iframe 传递 appid、token、userName、appPic、chatId 等业务参数，支持 URL
      与 postMessage 两种方式。
    </p>

    <div class="iframe-demo__form">
      <label
        v-for="field in formFields"
        :key="field.key"
        class="iframe-demo__field"
      >
        <span>{{ field.label }}</span>
        <input
          v-model="form[field.key]"
          type="text"
          :placeholder="field.placeholder"
        />
      </label>

      <label class="iframe-demo__field">
        <span>传参方式</span>
        <select v-model="paramMode">
          <option value="both">URL + postMessage</option>
          <option value="query">仅 URL</option>
          <option value="postMessage">仅 postMessage</option>
        </select>
      </label>
    </div>

    <div class="iframe-demo__actions">
      <button
        type="button"
        class="iframe-demo__btn iframe-demo__btn--ghost"
        @click="silentUpdateToken"
      >
        无感更新 token（不 reload）
      </button>
      <button type="button" class="iframe-demo__btn" @click="forceReload">
        强制重载 iframe
      </button>
    </div>

    <p v-if="updateTip" class="iframe-demo__tip">{{ updateTip }}</p>

    <IframeEmbed
      ref="embedRef"
      class="iframe-demo__frame"
      :src="childPageUrl"
      :params="embedParams"
      :param-mode="paramMode"
      title="智能体对话嵌入页"
      height="520"
      :silent-param-update="true"
      @message="handleChildMessage"
      @params-updated="handleParamsUpdated"
    />
  </div>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref } from 'vue';
  import {
    type IframeEmbedParams,
    type IframeParamMode
  } from '../components/iframeEmbed/types';
  import IframeEmbed from './GaixcIframeEmbed.vue';

  type IframeEmbedExpose = {
    updateParams: () => void;
    reload: (options?: { silent?: boolean }) => void;
  };

  const formFields = [
    { key: 'appid', label: 'appid', placeholder: 'gaixcAgentPlatform' },
    { key: 'token', label: 'token', placeholder: '业务鉴权 token' },
    { key: 'userName', label: 'userName', placeholder: '张三' },
    {
      key: 'appPic',
      label: 'appPic',
      placeholder: 'https://example.com/avatar.png'
    },
    { key: 'chatId', label: 'chatId', placeholder: 'chat-001' }
  ] as const;

  type FormKey = (typeof formFields)[number]['key'];

  const form = reactive<Record<FormKey, string>>({
    appid: 'gaixcAgentPlatform',
    token: 'demo-token-abc123',
    userName: '演示用户',
    appPic: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    chatId: 'chat-demo-001'
  });

  const paramMode = ref<IframeParamMode>('both');
  const embedRef = ref<IframeEmbedExpose | null>(null);
  const childMessage = ref('');
  const updateTip = ref('');

  /** 演示用子页面地址（同域，便于本地调试） */
  const childPageUrl = `${window.location.origin}/iframe-child`;

  const embedParams = computed<IframeEmbedParams>(() => ({ ...form }));

  /**
   * 模拟 token 刷新：只改 params，iframe 不会 reload。
   */
  function silentUpdateToken(): void {
    form.token = `demo-token-${Date.now()}`;
    updateTip.value = '已修改 token，等待无感 postMessage 下发…';
  }

  function forceReload(): void {
    embedRef.value?.reload();
    updateTip.value = '已强制重载 iframe（会有白屏闪烁）';
    childMessage.value = '';
  }

  function handleChildMessage(data: unknown): void {
    childMessage.value = JSON.stringify(data);
  }

  function handleParamsUpdated(params: IframeEmbedParams): void {
    updateTip.value = `无感更新成功，当前 token：${params.token}`;
  }
</script>

<style scoped lang="scss">
  .iframe-demo {
    padding: 8px 0 32px;
  }

  .iframe-demo__title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 600;
    color: #0f172a;
  }

  .iframe-demo__desc {
    margin: 0 0 20px;
    font-size: 14px;
    line-height: 1.6;
    color: #64748b;
  }

  .iframe-demo__form {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .iframe-demo__field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: #334155;

    input,
    select {
      height: 36px;
      padding: 0 10px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
    }
  }

  .iframe-demo__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
  }

  .iframe-demo__btn {
    height: 36px;
    padding: 0 16px;
    border: 1px solid #1677ff;
    border-radius: 8px;
    background: #1677ff;
    color: #fff;
    font-size: 13px;
    cursor: pointer;

    &:hover {
      background: #0958d9;
    }
  }

  .iframe-demo__btn--ghost {
    border-color: #cbd5e1;
    background: #fff;
    color: #334155;

    &:hover {
      background: #f8fafc;
    }
  }

  .iframe-demo__tip {
    margin: 0 0 12px;
    font-size: 12px;
    color: #1677ff;
    word-break: break-all;
  }

  .iframe-demo__frame {
    min-height: 520px;
  }
</style>
