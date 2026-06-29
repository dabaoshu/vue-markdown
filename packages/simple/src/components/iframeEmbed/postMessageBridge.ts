import {
  DEFAULT_IFRAME_MESSAGE_TYPES,
  type IframeEmbedParams,
  type IframeInitMessage,
  type IframeMessageTypes,
  type IframeParamsMessage,
  type IframeUpdateMessage
} from './types';

/**
 * 构造父页面向 iframe 发送的初始化消息。
 */
export function createIframeInitMessage(
  params: IframeEmbedParams,
  messageTypes: IframeMessageTypes = DEFAULT_IFRAME_MESSAGE_TYPES
): IframeInitMessage {
  return {
    type: messageTypes.init,
    payload: params
  };
}

/**
 * 构造父页面向 iframe 发送的无感更新消息。
 */
export function createIframeUpdateMessage(
  params: IframeEmbedParams,
  messageTypes: IframeMessageTypes = DEFAULT_IFRAME_MESSAGE_TYPES
): IframeUpdateMessage {
  return {
    type: messageTypes.update,
    payload: params
  };
}

/**
 * 向 iframe 内容窗口 postMessage 传递参数。
 */
export function postIframeParams(
  iframeWindow: Window,
  params: IframeEmbedParams,
  options: {
    targetOrigin?: string;
    isUpdate?: boolean;
    messageTypes?: IframeMessageTypes;
  } = {}
): void {
  const {
    targetOrigin = '*',
    isUpdate = false,
    messageTypes = DEFAULT_IFRAME_MESSAGE_TYPES
  } = options;

  const message: IframeParamsMessage = isUpdate
    ? createIframeUpdateMessage(params, messageTypes)
    : createIframeInitMessage(params, messageTypes);

  iframeWindow.postMessage(message, targetOrigin);
}

/**
 * 向 iframe 内容窗口 postMessage 传递初始化参数。
 */
export function postIframeInitParams(
  iframeWindow: Window,
  params: IframeEmbedParams,
  targetOrigin = '*',
  messageTypes?: IframeMessageTypes
): void {
  postIframeParams(iframeWindow, params, { targetOrigin, isUpdate: false, messageTypes });
}

/**
 * 无感更新 iframe 参数（不触发 reload）。
 */
export function postIframeUpdateParams(
  iframeWindow: Window,
  params: IframeEmbedParams,
  targetOrigin = '*',
  messageTypes?: IframeMessageTypes
): void {
  postIframeParams(iframeWindow, params, { targetOrigin, isUpdate: true, messageTypes });
}

/**
 * 判断 message 事件是否为 iframe 初始化消息。
 */
export function isIframeInitMessage(
  data: unknown,
  messageType = DEFAULT_IFRAME_MESSAGE_TYPES.init
): data is IframeInitMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const record = data as Record<string, unknown>;
  return record.type === messageType && typeof record.payload === 'object';
}

/**
 * 判断 message 事件是否为 iframe 无感更新消息。
 */
export function isIframeUpdateMessage(
  data: unknown,
  messageType = DEFAULT_IFRAME_MESSAGE_TYPES.update
): data is IframeUpdateMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const record = data as Record<string, unknown>;
  return record.type === messageType && typeof record.payload === 'object';
}
