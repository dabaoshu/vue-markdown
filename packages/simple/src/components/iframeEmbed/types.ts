/**
 * iframe 嵌入参数（通用键值结构）。
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

/** 智能体平台 iframe 业务协议消息类型 */
export const GAIXC_IFRAME_MESSAGE_TYPES: IframeMessageTypes = {
  init: 'GAIXC_IFRAME_INIT',
  update: 'GAIXC_IFRAME_UPDATE'
};

/** 子页面向父页面回传就绪消息的类型 */
export const GAIXC_IFRAME_CHILD_READY_TYPE = 'GAIXC_IFRAME_CHILD_READY' as const;

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

/**
 * 智能体平台 iframe 嵌入业务参数。
 */
export type GaixcAgentIframeParams = IframeEmbedParams & {
  /** 应用 ID */
  appid?: string;
  /** 鉴权 Token */
  token?: string;
  /** 当前用户名 */
  userName?: string;
  /** 应用/用户头像 URL */
  appPic?: string;
  /** 会话 ID */
  chatId?: string;
};
