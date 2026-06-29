import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import { isIframeInitMessage, isIframeUpdateMessage } from './postMessageBridge';
import {
  GAIXC_IFRAME_CHILD_READY_TYPE,
  GAIXC_IFRAME_MESSAGE_TYPES,
  type GaixcAgentIframeParams
} from './types';

export type UseGaixcIframeChildOptions = {
  /** 校验父页面 origin，未传则不校验 */
  allowedOrigin?: string;
  /** 收到初始化参数 */
  onInit?: (params: GaixcAgentIframeParams) => void;
  /** 收到无感更新参数 */
  onUpdate?: (params: GaixcAgentIframeParams) => void;
};

export type UseGaixcIframeChildReturn = {
  postMessageParams: Ref<GaixcAgentIframeParams>;
  lastUpdateAt: Ref<string>;
  notifyParentReady: (payload?: Record<string, unknown>) => void;
};

/**
 * 智能体 iframe 子页接入：监听 GAIXC 协议 postMessage。
 */
export function useGaixcIframeChild(
  options: UseGaixcIframeChildOptions = {}
): UseGaixcIframeChildReturn {
  const postMessageParams = ref<GaixcAgentIframeParams>({});
  const lastUpdateAt = ref('');

  function applyParams(payload: GaixcAgentIframeParams, isUpdate: boolean): void {
    postMessageParams.value = isUpdate
      ? { ...postMessageParams.value, ...payload }
      : { ...payload };

    if (isUpdate) {
      lastUpdateAt.value = new Date().toLocaleTimeString();
      options.onUpdate?.(postMessageParams.value);
      return;
    }

    options.onInit?.(postMessageParams.value);
  }

  function handleParentMessage(event: MessageEvent): void {
    if (options.allowedOrigin && event.origin !== options.allowedOrigin) {
      return;
    }

    const data = event.data;
    if (isIframeInitMessage(data, GAIXC_IFRAME_MESSAGE_TYPES.init)) {
      applyParams(data.payload as GaixcAgentIframeParams, false);
      return;
    }

    if (isIframeUpdateMessage(data, GAIXC_IFRAME_MESSAGE_TYPES.update)) {
      applyParams(data.payload as GaixcAgentIframeParams, true);
    }
  }

  function notifyParentReady(payload: Record<string, unknown> = {}): void {
    window.parent.postMessage(
      {
        type: GAIXC_IFRAME_CHILD_READY_TYPE,
        payload: {
          chatId: postMessageParams.value.chatId,
          timestamp: Date.now(),
          ...payload
        }
      },
      options.allowedOrigin ?? '*'
    );
  }

  onMounted(() => {
    window.addEventListener('message', handleParentMessage);
    notifyParentReady();
  });

  onBeforeUnmount(() => {
    window.removeEventListener('message', handleParentMessage);
  });

  return {
    postMessageParams,
    lastUpdateAt,
    notifyParentReady
  };
}
