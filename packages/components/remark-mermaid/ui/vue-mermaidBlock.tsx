import mermaid from 'mermaid';
import { computed, defineComponent, onMounted, ref, watch } from 'vue';
import type { MermaidBlockProps } from '../core/types';

const defaultLoadingText = 'Loading diagram...';
const defaultErrorText = 'Failed to render diagram';

/**
 * Mermaid 图表渲染组件
 * @description 将 Mermaid DSL 文本渲染成 SVG，并提供加载态与错误态
 */
export const MermaidBlock = defineComponent({
  name: 'MermaidBlock',
  props: {
    code: {
      type: String,
      required: true
    },
    mermaidConfig: {
      type: Object,
      required: false
    },
    id: {
      type: String,
      required: false
    },
    className: {
      type: String,
      required: false,
      default: 'mermaid-block'
    },
    loadingText: {
      type: String,
      required: false,
      default: defaultLoadingText
    },
    errorText: {
      type: String,
      required: false,
      default: defaultErrorText
    },
    showLoading: {
      type: Boolean,
      required: false,
      default: true
    },
    onRender: {
      type: Function,
      required: false
    },
    onError: {
      type: Function,
      required: false
    }
  },
  setup(props: MermaidBlockProps) {
    const containerRef = ref<HTMLElement | null>(null);
    const loading = ref(false);
    const errorMessage = ref('');

    const chartId = computed(
      () => props.id || `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );
    const normalizedCode = computed(() => (props.code || '').trim());

    /**
     * 执行 Mermaid 渲染
     * @returns {Promise<void>}
     */
    const renderMermaid = async () => {
      if (!containerRef.value || !normalizedCode.value) return;

      loading.value = true;
      errorMessage.value = '';

      try {
        mermaid.initialize({
          startOnLoad: false,
          ...(props.mermaidConfig || {})
        });
        const result = await mermaid.render(chartId.value, normalizedCode.value);
        containerRef.value.innerHTML = result.svg;
        props.onRender?.();
      } catch (error: any) {
        errorMessage.value = props.errorText || defaultErrorText;
        props.onError?.(error instanceof Error ? error : new Error(String(error)));
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      renderMermaid();
    });

    watch(
      () => [props.code, props.mermaidConfig],
      () => {
        renderMermaid();
      },
      { deep: true }
    );

    return () => {
      if (errorMessage.value) {
        return <div class={`${props.className} error`}>{errorMessage.value}</div>;
      }

      if (loading.value && props.showLoading) {
        return (
          <div class={`${props.className} loading`}>
            {props.loadingText || defaultLoadingText}
          </div>
        );
      }

      return <div class={props.className} ref={containerRef}></div>;
    };
  }
});

