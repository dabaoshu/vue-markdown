/**
 * iframe 嵌入参数（通用键值结构，不含业务字段约束）。
 */
export type IframeEmbedParams = Record<string, string | number | boolean | undefined>;

/** 参数传递方式 */
export type IframeParamMode = 'query' | 'postMessage' | 'both';

/** postMessage 消息类型配置 */
export type IframeMessageTypes = {
  init: string;
  update: string;
};

/** 默认消息类型（通用协议） */
export const DEFAULT_IFRAME_MESSAGE_TYPES: IframeMessageTypes = {
  init: 'IFRAME_EMBED_INIT',
  update: 'IFRAME_EMBED_UPDATE'
};

/** 通用初始化消息 type 常量 */
export const IFRAME_INIT_MESSAGE_TYPE = DEFAULT_IFRAME_MESSAGE_TYPES.init;

/** 通用无感更新消息 type 常量 */
export const IFRAME_UPDATE_MESSAGE_TYPE = DEFAULT_IFRAME_MESSAGE_TYPES.update;

/** 父页面向 iframe 发送的初始化消息结构 */
export type IframeInitMessage = {
  type: string;
  payload: IframeEmbedParams;
};

/** 父页面向 iframe 发送的无感更新消息结构 */
export type IframeUpdateMessage = {
  type: string;
  payload: IframeEmbedParams;
};

/** 父页面向 iframe 下发的参数消息联合类型 */
export type IframeParamsMessage = IframeInitMessage | IframeUpdateMessage;
