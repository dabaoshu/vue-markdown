import { MermaidBlock } from '@nnnb/markdown/vue-ui';
import { defineComponent, PropType, ref } from 'vue';
import MermaidCanvasViewport, {
  MermaidCanvasViewportExpose
} from './MermaidCanvasViewport';

const SCALE_STEP = 0.1;

/**
 * Mermaid 预览面板对外暴露能力
 */
export type MermaidPreviewPaneExpose = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  fitToViewport: () => Promise<void>;
  /** 获取截图用根节点 */
  getRootElement: () => HTMLElement | null;
};

/**
 * Mermaid 预览面板：画布视口 + 渲染块
 * @description 缩放等交互通过 expose 交由外层（如卡片工具栏）调用
 */
export const MermaidPreviewPane = defineComponent({
  name: 'MermaidPreviewPane',
  props: {
    code: {
      type: String,
      required: true
    },
    cacheKey: {
      type: String,
      required: false
    },
    mermaidConfig: {
      type: Object,
      required: false
    },
    className: {
      type: String,
      required: false,
      default: 'mermaid-block'
    },
    streamLoading: {
      type: Boolean,
      required: false,
      default: false
    },
    loadingText: {
      type: String,
      required: false
    },
    errorText: {
      type: String,
      required: false
    },
    onRender: {
      type: Function as PropType<() => void>,
      required: false
    },
    onError: {
      type: Function as PropType<(error: Error) => void>,
      required: false
    }
  },
  setup(props, { expose }) {
    const inlineViewportRef = ref<MermaidCanvasViewportExpose | null>(null);
    const inlineRootRef = ref<HTMLElement | null>(null);

    expose({
      zoomIn: () => {
        inlineViewportRef.value?.zoomIn();
      },
      zoomOut: () => {
        inlineViewportRef.value?.zoomOut();
      },
      resetView: () => {
        inlineViewportRef.value?.resetView();
      },
      fitToViewport: async () => {
        await inlineViewportRef.value?.fitToViewport();
      },
      getRootElement: () => inlineRootRef.value
    });

    return () => {
      const { onRender, onError, ...rest } = props;
      return (
        <div
          ref={inlineRootRef}
          style={{
            position: 'relative',
            height: '100%'
          }}
        >
          <MermaidCanvasViewport
            ref={inlineViewportRef}
            contentKey={props.cacheKey || props.code}
            watchSources={[props.code, props.streamLoading]}
            wheelStep={SCALE_STEP}
            autoFitOnResize={true}
            preserveUserTransform={true}
          >
            <MermaidBlock
              {...rest}
              onRender={() => {
                props.onRender?.();
                void inlineViewportRef.value?.fitToViewport();
              }}
            />
          </MermaidCanvasViewport>
        </div>
      );
    };
  }
});

export default MermaidPreviewPane;
