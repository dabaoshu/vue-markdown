import { computed, defineComponent, ref, watch } from 'vue';
import './thinkElement.scss';

/** hast / 自定义组件透传节点（含 meta.loading） */
type ThinkHastNode = {
  tagName?: string;
  meta?: { loading?: boolean };
  properties?: { loading?: boolean | string };
  children?: ThinkHastNode[];
};

/**
 * 将属性值规范为 boolean（兼容 hast 布尔 / 字符串）。
 * @param value 原始 loading 值。
 */
function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value === '' || value === 'true' || value === '1';
  }
  return Boolean(value);
}

/**
 * 从 think 节点读取 loading（优先 meta.loading）。
 * @param node hast 节点。
 */
function readThinkNodeLoading(node: ThinkHastNode | undefined): boolean {
  if (!node) return false;
  if (typeof node.meta?.loading === 'boolean') {
    return node.meta.loading;
  }
  return toBoolean(node.properties?.loading);
}

/**
 * 递归检测 thinkGroup 子树中是否仍有 loading 的 think。
 * @param node hast 节点。
 */
function hasLoadingThink(node: ThinkHastNode | undefined): boolean {
  if (!node) return false;
  if (node.tagName === 'think' && readThinkNodeLoading(node)) {
    return true;
  }
  return (node.children ?? []).some((child) => hasLoadingThink(child));
}

/**
 * Kimi 风格折叠箭头图标。
 */
function ThinkChevron(props: { collapsed: boolean }) {
  return (
    <span
      class={[
        'thinkGroupElementt__chevron',
        props.collapsed ? 'thinkGroupElementt__chevron--collapsed' : ''
      ]}
      aria-hidden="true"
    >
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4.5 6.25L8 9.75L11.5 6.25"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * 单个 think 块渲染组件（Demo 业务 UI，对应 remarkThink 解析节点）。
 * 视觉对齐 Kimi：弱化灰色正文 + 左侧细线；loading 时展示末尾闪烁光标。
 */
const ThinkElement = defineComponent({
  name: 'ThinkElement',
  inheritAttrs: false,
  props: {
    node: {
      type: Object as () => ThinkHastNode,
      default: undefined
    }
  },
  setup(props, { slots, attrs }) {
    const loading = computed(() => readThinkNodeLoading(props.node));

    return () => {
      const isLoading = loading.value;

      return (
        <div
          {...attrs}
          class={[
            'markdown-think',
            attrs.class,
            isLoading ? 'markdown-think--loading' : ''
          ]}
          data-loading={isLoading ? '' : undefined}
          aria-busy={isLoading || undefined}
        >
          {slots.default && slots.default()}
          {isLoading ? (
            <span class={'markdown-think__cursor'} aria-hidden="true" />
          ) : null}
        </div>
      );
    };
  }
});

/**
 * 连续 thinkFlow 合并后的 thinkGroup 容器组件（Demo 业务 UI）。
 * 视觉对齐 Kimi：可折叠标题；loading 时展示「深度思考中」与动画。
 */
export const thinkGroupElementt = defineComponent({
  name: 'thinkGroupElementt',
  inheritAttrs: false,
  props: {
    /** hast hProperties.loading，由 MergeThinkRemark 同步 */
    loading: {
      type: [Boolean, String],
      default: undefined
    },
    node: {
      type: Object as () => ThinkHastNode,
      default: undefined
    }
  },
  setup(props, { slots, attrs }) {
    /** 是否折叠思考内容（loading 时强制展开） */
    const collapsed = ref(false);

    const isLoading = computed(() => {
      if (props.loading !== undefined && props.loading !== null) {
        const fromProp = toBoolean(props.loading);
        if (fromProp) return true;
      }
      return hasLoadingThink(props.node);
    });

    watch(
      isLoading,
      (loading) => {
        if (loading) {
          collapsed.value = false;
        }
      },
      { immediate: true }
    );

    /**
     * 切换思考内容展开 / 折叠。
     */
    const toggleCollapsed = () => {
      if (isLoading.value) return;
      collapsed.value = !collapsed.value;
    };

    return () => {
      const loading = isLoading.value;
      const isCollapsed = collapsed.value && !loading;
      const title = loading ? '深度思考中' : '已深度思考';

      return (
        <div
          {...attrs}
          class={[
            'thinkGroupElementt',
            attrs.class,
            loading ? 'thinkGroupElementt--loading' : ''
          ]}
          data-loading={loading ? '' : undefined}
          aria-busy={loading || undefined}
        >
          <button
            type="button"
            class={[
              'thinkGroupElementt__header',
              loading ? 'thinkGroupElementt__header--loading' : ''
            ]}
            aria-expanded={!isCollapsed}
            disabled={loading}
            onClick={toggleCollapsed}
          >
            {loading ? (
              <span
                class={'thinkGroupElementt__spinner'}
                aria-hidden="true"
              />
            ) : (
              <ThinkChevron collapsed={isCollapsed} />
            )}
            <span class={'thinkGroupElementt__title'}>
              {title}
              {loading ? (
                <span class={'thinkGroupElementt__dots'} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              ) : null}
            </span>
          </button>
          <div
            class={[
              'thinkGroupElementt__body',
              isCollapsed ? 'thinkGroupElementt__body--collapsed' : ''
            ]}
          >
            {slots.default && slots.default()}
          </div>
        </div>
      );
    };
  }
});

export default ThinkElement;
