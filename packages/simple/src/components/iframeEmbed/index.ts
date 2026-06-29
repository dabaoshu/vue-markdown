/** 通用 iframe 嵌入组件 */
export { default as IframeEmbed } from './IframeEmbed.vue';

export { buildIframeUrl, serializeIframeParams } from './buildIframeUrl';
export {
  isIframeInitMessage,
  isIframeUpdateMessage,
  postIframeInitParams,
  postIframeUpdateParams,
  postIframeParams
} from './postMessageBridge';

export {
  DEFAULT_IFRAME_MESSAGE_TYPES,
  GAIXC_IFRAME_CHILD_READY_TYPE,
  GAIXC_IFRAME_MESSAGE_TYPES,
  type GaixcAgentIframeParams,
  type IframeEmbedParams,
  type IframeInitMessage,
  type IframeMessageTypes,
  type IframeParamMode,
  type IframeParamsMessage,
  type IframeUpdateMessage
} from './types';

export { useGaixcIframeChild } from './useGaixcIframeChild';
export type {
  UseGaixcIframeChildOptions,
  UseGaixcIframeChildReturn
} from './useGaixcIframeChild';
