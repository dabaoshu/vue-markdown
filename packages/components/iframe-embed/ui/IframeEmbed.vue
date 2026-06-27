<template>
  <div class="iframe-embed" :style="wrapperStyle">
    <div v-if="loading" class="iframe-embed__loading">
      <span class="iframe-embed__spinner" aria-hidden="true" />
      <span class="iframe-embed__loading-text">{{ loadingText }}</span>
    </div>

    <iframe
      ref="iframeRef"
      class="iframe-embed__frame"
      :class="{ 'iframe-embed__frame--hidden': loading && hideFrameWhileLoading }"
      :src="iframeSrc"
      :title="title"
      :sandbox="sandbox"
      :allow="allow"
      frameborder="0"
      @load="handleIframeLoad"
      @error="handleIframeError"
    />

    <p v-if="errorMessage" class="iframe-embed__error" role="alert">
      {{ errorMessage }}
    </p>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import {
    DEFAULT_IFRAME_MESSAGE_TYPES,
    type IframeEmbedParams,
    type IframeMessageTypes,
    type IframeParamMode
  } from '../core/types';
  import { buildIframeUrl } from '../engine/buildIframeUrl';
  import { postIframeParams } from '../engine/postMessageBridge';

  const props = withDefaults(
    defineProps<{
      src: string;
      params?: IframeEmbedParams;
      paramMode?: IframeParamMode;
      targetOrigin?: string;
      initMessageType?: string;
      updateMessageType?: string;
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
      initMessageType: DEFAULT_IFRAME_MESSAGE_TYPES.init,
      updateMessageType: DEFAULT_IFRAME_MESSAGE_TYPES.update,
      title: '嵌入页面',
      width: '100%',
      height: '100%',
      sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups',
      allow: undefined,
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
    (e: 'params-sent', params: IframeEmbedParams, isUpdate: boolean): void;
    (e: 'params-updated', params: IframeEmbedParams): void;
    (e: 'message', data: unknown, event: MessageEvent): void;
  }>();

  const iframeRef = ref<HTMLIFrameElement | null>(null);
  const loading = ref(true);
  const errorMessage = ref('');
  const hasLoadedOnce = ref(false);

  const messageTypes = computed<IframeMessageTypes>(() => ({
    init: props.initMessageType,
    update: props.updateMessageType
  }));

  function resolveIframeSrc(
    baseUrl: string,
    params: IframeEmbedParams,
    mode: IframeParamMode
  ): string {
    if (mode === 'postMessage') {
      return baseUrl;
    }
    return buildIframeUrl(baseUrl, params);
  }

  const iframeSrc = ref('');

  watch(
    () => [props.src, props.paramMode] as const,
    ([src, mode]) => {
      iframeSrc.value = resolveIframeSrc(src, props.params, mode);
      loading.value = true;
      hasLoadedOnce.value = false;
    },
    { immediate: true }
  );

  const wrapperStyle = computed(() => ({
    width: typeof props.width === 'number' ? `${props.width}px` : props.width,
    height: typeof props.height === 'number' ? `${props.height}px` : props.height
  }));

  function sendParamsToIframe(isUpdate = false): void {
    const win = iframeRef.value?.contentWindow;
    if (!win) {
      return;
    }

    postIframeParams(win, props.params, {
      targetOrigin: props.targetOrigin,
      isUpdate,
      messageTypes: messageTypes.value
    });
    emit('params-sent', props.params, isUpdate);
    if (isUpdate) {
      emit('params-updated', props.params);
    }
  }

  function updateParamsSilently(): void {
    if (!hasLoadedOnce.value) {
      return;
    }
    sendParamsToIframe(true);
  }

  function reload(options?: { silent?: boolean }): void {
    const silent = options?.silent ?? !props.showLoadingOnReload;
    if (!silent) {
      loading.value = true;
    }

    iframeSrc.value = resolveIframeSrc(props.src, props.params, props.paramMode);
    hasLoadedOnce.value = false;
  }

  function handleIframeLoad(event: Event): void {
    loading.value = false;
    errorMessage.value = '';
    hasLoadedOnce.value = true;

    if (
      props.autoPostMessage &&
      (props.paramMode === 'postMessage' || props.paramMode === 'both')
    ) {
      sendParamsToIframe(false);
    }

    emit('load', event);
  }

  function handleIframeError(event: Event): void {
    loading.value = false;
    errorMessage.value = '嵌入页面加载失败，请检查地址或网络';
    emit('error', event);
  }

  function handleWindowMessage(event: MessageEvent): void {
    if (props.targetOrigin !== '*' && event.origin !== props.targetOrigin) {
      return;
    }

    const iframeWin = iframeRef.value?.contentWindow;
    if (iframeWin && event.source !== iframeWin) {
      return;
    }

    emit('message', event.data, event);
  }

  onMounted(() => {
    window.addEventListener('message', handleWindowMessage);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('message', handleWindowMessage);
  });

  watch(
    () => props.params,
    () => {
      if (!hasLoadedOnce.value) {
        return;
      }

      if (props.silentParamUpdate) {
        if (props.autoPostMessage && props.paramMode !== 'query') {
          updateParamsSilently();
        }
        return;
      }

      if (props.paramMode === 'postMessage') {
        sendParamsToIframe(true);
        return;
      }

      reload({ silent: !props.showLoadingOnReload });
    },
    { deep: true }
  );

  defineExpose({
    updateParams: updateParamsSilently,
    sendParams: sendParamsToIframe,
    reload,
    getIframeEl: () => iframeRef.value
  });
</script>

<style scoped lang="scss">
  .iframe-embed {
    position: relative;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .iframe-embed__frame {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
  }

  .iframe-embed__frame--hidden {
    visibility: hidden;
  }

  .iframe-embed__loading {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #f8fafc;
  }

  .iframe-embed__spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #cbd5e1;
    border-top-color: #1677ff;
    border-radius: 50%;
    animation: iframe-embed-spin 0.8s linear infinite;
  }

  .iframe-embed__loading-text {
    font-size: 14px;
    color: #64748b;
  }

  .iframe-embed__error {
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 16px;
    margin: 0;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13px;
    color: #b91c1c;
    background: #fef2f2;
  }

  @keyframes iframe-embed-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
