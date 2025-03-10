// 从 Vue 中导入必要的函数和模块
import { Directive, DirectiveBinding, createVNode, render } from 'vue';
// 从 Element Plus 中导入 ElTooltip 组件
import { ElTooltip } from 'element-plus';
// 导入 Element Plus 样式
import 'element-plus/dist/index.css';

// 定义 tooltip 选项的结构
interface TooltipOptions {
  // tooltip 内容
  content?: string;
  // tooltip 位置
  placement?:
    | 'top'
    | 'top-start'
    | 'top-end'
    | 'bottom'
    | 'bottom-start'
    | 'bottom-end'
    | 'left'
    | 'left-start'
    | 'left-end'
    | 'right'
    | 'right-start'
    | 'right-end';
  // tooltip 效果
  effect?: 'dark' | 'light';
  // 是否为原始内容
  raw?: boolean;
  // 其他选项
  [key: string]: any;
}

const createVNodeTooltip = (options: TooltipOptions) => {
  // 创建一个 tooltip 组件实例
  const tooltipVNode = createVNode(ElTooltip, options);
  // 渲染 tooltip 组件实例
  render(tooltipVNode, document.createElement('div'));
  // 返回 tooltip 组件实例
  return tooltipVNode;
};

// 创建一个 tooltip 指令
export const tooltipDirective: Directive = {
  // 当指令被挂载到元素上时调用
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    // 创建一个 tooltip 容器
    const container = document.createElement('div');
    // 将容器添加到 body 中
    document.body.appendChild(container);

    // 获取指令的值
    const value = binding.value;
    // 根据值的类型创建 tooltip 选项
    const options: TooltipOptions =
      typeof value === 'string' ? { content: value } : value || {};

    // 设置默认值
    const {
      content = '',
      placement = 'top',
      effect = 'dark',
      ...rest
    } = options;

    // 创建一个 tooltip VNode
    const tooltipVNode = createVNode(
      ElTooltip,
      {
        // tooltip 内容
        content,
        // tooltip 位置
        placement,
        // tooltip 效果
        effect,
        // 其他选项
        ...rest,
        // 参考元素
        reference: el
      },
      {
        // 默认插槽
        default: () => null
      }
    );

    // 渲染 tooltip
    render(tooltipVNode, container);

    // 存储实例和清理函数
    (el as any)._tooltip_container = container;
    (el as any)._tooltip_instance = tooltipVNode.component;
    (el as any)._tooltip_cleanup = () => {
      // 清理 tooltip
      render(null, container);
      // 移除容器
      container.remove();
    };

    // 手动控制 tooltip 的显示和隐藏
    const instance = tooltipVNode.component;
    if (instance) {
      // 显示 tooltip
      const showTooltip = () => {
        // 获取元素的矩形
        const rect = el.getBoundingClientRect();
        // 更新 tooltip 的参考元素
        instance.props.referenceEl = el;
        // 显示 tooltip
        instance.props.visible = true;
      };

      // 隐藏 tooltip
      const hideTooltip = () => {
        // 隐藏 tooltip
        instance.props.visible = false;
      };

      // 添加事件监听器
      el.addEventListener('mouseenter', showTooltip);
      el.addEventListener('mouseleave', hideTooltip);

      // 存储事件清理函数
      (el as any)._tooltip_events_cleanup = () => {
        // 移除事件监听器
        el.removeEventListener('mouseenter', showTooltip);
        el.removeEventListener('mouseleave', hideTooltip);
      };
    }
  },

  updated(el: HTMLElement, binding: DirectiveBinding) {
    // 获取新的值
    const value = binding.value;
    const options: TooltipOptions =
      typeof value === 'string' ? { content: value } : value || {};

    // 更新tooltip内容
    const instance = (el as any)._tooltip_instance;
    if (instance) {
      Object.assign(instance.props, {
        ...options,
        reference: el
      });
    }
  },

  beforeUnmount(el: HTMLElement) {
    // 清理事件监听
    if ((el as any)._tooltip_events_cleanup) {
      (el as any)._tooltip_events_cleanup();
    }
    // 清理组件
    if ((el as any)._tooltip_cleanup) {
      (el as any)._tooltip_cleanup();
    }
  }
};
