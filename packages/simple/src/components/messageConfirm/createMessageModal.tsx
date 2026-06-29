import MessageDialog from './MessageDialog.vue';
import { createApp } from 'vue';

/** 与 {@link createMessageModal} 合并进对话框的配置项 */
export type MessageModalOptions = {
  /** 语义色类型；与 `tone` 二选一，`type` 优先 */
  type?: string;
  /** 与 `type` 同源别名（示例页常用 info / warning / success） */
  tone?: string;
  width?: string | number;
  height?: string | number;
  title?: string;
  showConfirm?: boolean;
  showCancel?: boolean;
  showIcon?: boolean;
  content?: string;
  tips?: string;
  confirmBtnTxt?: string;
  cancelBtnTxt?: string;
  modalClass?: string;
  icon?: string;
  onConfirm?: (values?: unknown) => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
};

const defaultProps = {
  type: 'warning',
  title: '提示',
  content: '',
  tips: '',
  showConfirm: true,
  showCancel: true,
  showIcon: true,
  confirmBtnTxt: '确定',
  cancelBtnTxt: '取消',
  icon: 'icon-v2c-zhuyi'
} as const;

/**
 * 用户关闭或取消弹窗时，`createMessageModal` 返回的 Promise 会以该错误 reject。
 */
export class MessageModalCancelledError extends Error {
  readonly isCancelled = true as const;

  constructor(message = '用户取消') {
    super(message);
    this.name = 'MessageModalCancelledError';
  }
}

/**
 * 判断是否为「用户取消」导致的 rejection。
 *
 * @param err - `catch` 捕获的值
 */
export function isMessageModalCancelled(err: unknown): err is MessageModalCancelledError {
  return err instanceof MessageModalCancelledError;
}

/**
 * 编程式打开确认弹窗，挂载到 `document.body`，关闭后自动卸载。
 *
 * @param optionProps - 与内置默认值合并后传给 `MessageDialog`
 * @param children - default 插槽渲染函数
 * @param footer - footer 插槽渲染函数
 * @param header - header 插槽渲染函数
 * @returns 确定且 `onConfirm` 成功时 `resolve(submit 返回值或 undefined)`；取消时 `reject(MessageModalCancelledError)`
 */
export function createMessageModal(
  optionProps: MessageModalOptions = {},
  children?: () => unknown,
  footer?: () => unknown,
  header?: () => unknown
) {
  const { tone, ...restOptions } = optionProps;
  const merged = {
    ...defaultProps,
    ...restOptions,
    type: optionProps.type ?? tone ?? defaultProps.type
  };

  return new Promise((resolve, reject) => {
    const parentNode = document.createElement('div');

    const app = createApp(() => (
      <MessageDialog
        {...{
          ...merged,
          onConfirm: async (values?: unknown) => {
            try {
              await merged.onConfirm?.(values);
              resolve(values);
              unmount();
            } catch (error) {
              reject(error);
            }
          },
          onCancel: async () => {
            await merged.onCancel?.();
            unmount();
            reject(new MessageModalCancelledError());
          }
        }}
      >
        {{
          default: children,
          footer,
          header
        }}
      </MessageDialog>
    ));

    const unmount = () => {
      app.unmount();
      parentNode.remove();
    };

    document.body.appendChild(parentNode);
    app.mount(parentNode);
  });
}
