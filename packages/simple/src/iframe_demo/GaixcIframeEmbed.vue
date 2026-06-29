<template>
  <IframeEmbed
    ref="innerRef"
    v-bind="forwardProps"
    :params="params"
    :init-message-type="GAIXC_IFRAME_MESSAGE_TYPES.init"
    :update-message-type="GAIXC_IFRAME_MESSAGE_TYPES.update"
    @load="(event) => emit('load', event)"
    @error="(event) => emit('error', event)"
    @params-sent="(p, isUpdate) => emit('params-sent', p, isUpdate)"
    @params-updated="(p) => emit('params-updated', p)"
    @message="(data, event) => emit('message', data, event)"
  />
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import IframeEmbed from '../components/iframeEmbed/IframeEmbed.vue';
  import {
    GAIXC_IFRAME_MESSAGE_TYPES,
    type GaixcAgentIframeParams,
    type IframeParamMode
  } from '../components/iframeEmbed/types';

  const props = withDefaults(
    defineProps<{
      /** 智能体/对话页地址 */
      src: string;
      /** 业务参数：appid、token、userName、appPic、chatId 等 */
      params?: GaixcAgentIframeParams;
      paramMode?: IframeParamMode;
      targetOrigin?: string;
      title?: string;
      width?: string | number;
      height?: string | number;
      sandbox?: string;
      allow?: string;
      loadingText?: string;
      hideFrameWhileLoading?: boolean;
      autoPostMessage?: boolean;
      silentParamUpdate?: boolean;
      showLoadingOnReload?: boolean;
    }>(),
    {
      params: () => ({}),
      paramMode: 'both',
      targetOrigin: '*',
      title: '智能体嵌入页',
      width: '100%',
      height: '100%',
      loadingText: '页面加载中…',
      hideFrameWhileLoading: true,
      autoPostMessage: true,
      silentParamUpdate: true,
      showLoadingOnReload: false
    }
  );

  const emit = defineEmits<{
    (e: 'load', event: Event): void;
    (e: 'error', event: Event): void;
    (e: 'params-sent', params: GaixcAgentIframeParams, isUpdate: boolean): void;
    (e: 'params-updated', params: GaixcAgentIframeParams): void;
    (e: 'message', data: unknown, event: MessageEvent): void;
  }>();

  const innerRef = ref<InstanceType<typeof IframeEmbed> | null>(null);

  /** 透传除 params 外的通用 props */
  const forwardProps = computed(() => {
    const { params: _params, ...rest } = props;
    return rest;
  });

  defineExpose({
    updateParams: () => innerRef.value?.updateParams(),
    sendParams: (isUpdate?: boolean) => innerRef.value?.sendParams(isUpdate),
    reload: (options?: { silent?: boolean }) => innerRef.value?.reload(options),
    getIframeEl: () => innerRef.value?.getIframeEl() ?? null
  });
</script>
