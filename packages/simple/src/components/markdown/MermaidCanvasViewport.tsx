import {
  computed,
  defineComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue';
import type { CSSProperties, PropType } from 'vue';

type WheelBehavior = 'zoom' | 'pan';

export type MermaidCanvasViewportExpose = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  fitToViewport: () => Promise<void>;
  setTransform: (scale: number, x: number, y: number) => void;
};

const DEFAULT_MIN_SCALE = 0.2;
const DEFAULT_MAX_SCALE = 4;
const DEFAULT_WHEEL_STEP = 0.12;
const DEFAULT_PAN_STEP = 32;

export const MermaidCanvasViewport = defineComponent({
  name: 'MermaidCanvasViewport',
  props: {
    minScale: {
      type: Number,
      default: DEFAULT_MIN_SCALE
    },  
    maxScale: {
      type: Number,
      default: DEFAULT_MAX_SCALE
    },
    wheelStep: {
      type: Number,
      default: DEFAULT_WHEEL_STEP
    },
    panStep: {
      type: Number,
      default: DEFAULT_PAN_STEP
    },
    wheelBehavior: {
      type: String as PropType<WheelBehavior>,
      default: 'zoom'
    },
    autoFitOnMount: {
      type: Boolean,
      default: true
    },
    autoFitOnResize: {
      type: Boolean,
      default: true
    },
    preserveUserTransform: {
      type: Boolean,
      default: true
    },
    background: {
      type: String,
      default: '#ffffff'
    },
    contentKey: {
      type: String,
      required: false
    },
    watchSources: {
      type: Array as PropType<Array<string | number | boolean | null | undefined>>,
      default: () => []
    }
  },
  setup(props, { slots, expose }) {
    const containerRef = ref<HTMLElement | null>(null);
    const contentRef = ref<HTMLElement | null>(null);

    const scale = ref(1);
    const translateX = ref(0);
    const translateY = ref(0);
    const userInteracted = ref(false);

    /** 未做 CSS transform 缩放时的内容尺寸，用于通过修改 SVG 像素尺寸实现矢量级清晰缩放 */
    const intrinsicSize = ref({ w: 0, h: 0 });

    const isPanning = ref(false);
    const startX = ref(0);
    const startY = ref(0);
    const startTranslateX = ref(0);
    const startTranslateY = ref(0);

    let resizeObserver: ResizeObserver | null = null;

    /**
     * 移除视口为 SVG 写入的样式，便于用 scroll 尺寸测量「自然」占位。
     * @param root 内容根节点
     * @returns {void}
     */
    function clearSvgDimensions(root: HTMLElement | null): void {
      if (!root) return;
      const svg = root.querySelector('svg');
      if (!svg) return;
      svg.style.removeProperty('width');
      svg.style.removeProperty('height');
      svg.style.removeProperty('max-width');
    }

    /**
     * 在尚未有缓存尺寸时，根据当前 DOM 测量内容固有宽高。
     * @param content 内容根节点
     * @returns {void}
     */
    function ensureIntrinsicMeasured(content: HTMLElement): void {
      if (intrinsicSize.value.w > 0 && intrinsicSize.value.h > 0) return;
      clearSvgDimensions(content);
      void content.offsetHeight;
      const w = content.scrollWidth;
      const h = content.scrollHeight;
      if (!w || !h) return;
      intrinsicSize.value = { w, h };
    }

    /**
     * 通过设置根 SVG 的像素宽高实现缩放，避免对整层使用 transform: scale 导致栅格化发糊。
     * @returns {void}
     */
    function applySvgLayoutScale(): void {
      const content = contentRef.value;
      if (!content) return;
      ensureIntrinsicMeasured(content);
      if (!intrinsicSize.value.w || !intrinsicSize.value.h) return;
      const svg = content.querySelector('svg') as SVGSVGElement | null;
      if (!svg) return;
      const { w: iw, h: ih } = intrinsicSize.value;
      const w = iw * scale.value;
      const h = ih * scale.value;
      svg.style.width = `${w}px`;
      svg.style.height = `${h}px`;
      svg.style.maxWidth = 'none';
    }

    /**
     * 约束缩放值，避免超出可交互范围。
     * @param value 目标缩放值
     * @returns {number}
     */
    function clampScale(value: number): number {
      if (!Number.isFinite(value)) return 1;
      if (value < props.minScale) return props.minScale;
      if (value > props.maxScale) return props.maxScale;
      return Number(value.toFixed(3));
    }

    /**
     * 更新缩放与平移：缩放通过根 SVG 的宽高体现以保持矢量清晰，平移通过 CSS translate 应用。
     * @param nextScale 缩放值
     * @param nextX X 轴平移（px）
     * @param nextY Y 轴平移（px）
     * @returns {void}
     */
    function setTransform(nextScale: number, nextX: number, nextY: number): void {
      scale.value = clampScale(nextScale);
      translateX.value = Number(nextX.toFixed(2));
      translateY.value = Number(nextY.toFixed(2));
      applySvgLayoutScale();
    }

    /**
     * 在指定锚点位置执行缩放，保持鼠标下内容位置稳定。
     * @param deltaScale 缩放增量
     * @param anchorX 锚点 X（相对容器）
     * @param anchorY 锚点 Y（相对容器）
     * @returns {void}
     */
    function zoomAt(deltaScale: number, anchorX: number, anchorY: number): void {
      const prevScale = scale.value;
      const nextScale = clampScale(prevScale + deltaScale);
      if (nextScale === prevScale) return;

      const ratio = nextScale / prevScale;
      const nextX = anchorX - (anchorX - translateX.value) * ratio;
      const nextY = anchorY - (anchorY - translateY.value) * ratio;
      setTransform(nextScale, nextX, nextY);
      userInteracted.value = true;
    }

    /**
     * 让内容按可视区域自适应并居中显示。
     * @returns {Promise<void>}
     */
    async function fitToViewport(): Promise<void> {
      await nextTick();
      const container = containerRef.value;
      const content = contentRef.value;
      if (!container || !content) return;

      clearSvgDimensions(content);
      await nextTick();

      const rawW = content.scrollWidth;
      const rawH = content.scrollHeight;
      if (!rawW || !rawH) {
        intrinsicSize.value = { w: 0, h: 0 };
        setTransform(1, 0, 0);
        return;
      }
      intrinsicSize.value = { w: rawW, h: rawH };
      const contentWidth = rawW;
      const contentHeight = rawH;

      const viewportWidth = container.clientWidth;
      const viewportHeight = container.clientHeight;
      const fitScale = clampScale(
        Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight, 1)
      );

      const scaledWidth = contentWidth * fitScale;
      const scaledHeight = contentHeight * fitScale;
      const centeredX = (viewportWidth - scaledWidth) / 2;
      const centeredY = (viewportHeight - scaledHeight) / 2;
      setTransform(fitScale, centeredX, centeredY);
    }

    /**
     * 重置到默认视图（自适应 + 居中）。
     * @returns {void}
     */
    function resetView(): void {
      userInteracted.value = false;
      void fitToViewport();
    }

    /**
     * 开始拖拽平移。
     * @param event 鼠标按下事件
     * @returns {void}
     */
    function onPointerDown(event: MouseEvent): void {
      if (event.button !== 0 && event.button !== 1) return;
      event.preventDefault();
      isPanning.value = true;
      startX.value = event.clientX;
      startY.value = event.clientY;
      startTranslateX.value = translateX.value;
      startTranslateY.value = translateY.value;
    }

    /**
     * 拖拽过程中更新平移偏移量。
     * @param event 鼠标移动事件
     * @returns {void}
     */
    function onPointerMove(event: MouseEvent): void {
      if (!isPanning.value) return;
      event.preventDefault();
      const deltaX = event.clientX - startX.value;
      const deltaY = event.clientY - startY.value;
      setTransform(scale.value, startTranslateX.value + deltaX, startTranslateY.value + deltaY);
      userInteracted.value = true;
    }

    /**
     * 结束拖拽交互状态。
     * @returns {void}
     */
    function onPointerUp(): void {
      isPanning.value = false;
    }

    /**
     * 处理滚轮交互，可切换为缩放或平移模式。
     * @param event 滚轮事件
     * @returns {void}
     */
    function onWheel(event: WheelEvent): void {
      const container = containerRef.value;
      if (!container) return;
      event.preventDefault();

      if (props.wheelBehavior === 'pan') {
        const nextX = translateX.value - Math.sign(event.deltaX) * props.panStep;
        const nextY = translateY.value - Math.sign(event.deltaY || event.deltaX) * props.panStep;
        setTransform(scale.value, nextX, nextY);
        userInteracted.value = true;
        return;
      }

      const rect = container.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const anchorY = event.clientY - rect.top;
      const deltaScale = event.deltaY < 0 ? props.wheelStep : -props.wheelStep;
      zoomAt(deltaScale, anchorX, anchorY);
    }

    /**
     * 放大视图，默认以容器中心点为锚点。
     * @returns {void}
     */
    function zoomIn(): void {
      const container = containerRef.value;
      if (!container) return;
      zoomAt(props.wheelStep, container.clientWidth / 2, container.clientHeight / 2);
    }

    /**
     * 缩小视图，默认以容器中心点为锚点。
     * @returns {void}
     */
    function zoomOut(): void {
      const container = containerRef.value;
      if (!container) return;
      zoomAt(-props.wheelStep, container.clientWidth / 2, container.clientHeight / 2);
    }

    onMounted(() => {
      if (props.autoFitOnMount) {
        void fitToViewport();
      }
      if (props.autoFitOnResize && containerRef.value && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (props.preserveUserTransform && userInteracted.value) return;
          void fitToViewport();
        });
        resizeObserver.observe(containerRef.value);
      }
      window.addEventListener('mouseup', onPointerUp);
    });

    onBeforeUnmount(() => {
      resizeObserver?.disconnect();
      resizeObserver = null;
      window.removeEventListener('mouseup', onPointerUp);
    });

    watch(
      () => [props.contentKey, ...props.watchSources],
      async () => {
        intrinsicSize.value = { w: 0, h: 0 };
        await nextTick();
        if (contentRef.value) clearSvgDimensions(contentRef.value);
        await nextTick();
        if (props.preserveUserTransform && userInteracted.value) {
          applySvgLayoutScale();
          return;
        }
        await fitToViewport();
      },
      { flush: 'post' }
    );

    const containerStyle = computed<CSSProperties>(() => ({
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
      background: props.background,
      cursor: isPanning.value ? 'grabbing' : 'grab',
      userSelect: 'none',
      touchAction: 'none'
    }));

    const contentStyle = computed<CSSProperties>(() => ({
      transform: `translate3d(${translateX.value}px, ${translateY.value}px, 0)`,
      transformOrigin: 'left top',
      position: 'absolute',
      left: '0',
      top: '0'
    }));

    expose({
      zoomIn,
      zoomOut,
      resetView,
      fitToViewport,
      setTransform
    });

    return () => (
      <div
        ref={containerRef}
        style={containerStyle.value}
        onMousedown={onPointerDown}
        onMousemove={onPointerMove}
        onMouseleave={onPointerUp}
        onWheel={onWheel}
      >
        <div ref={contentRef} style={contentStyle.value}>
          {slots.default?.()}
        </div>
      </div>
    );
  }
});

export default MermaidCanvasViewport;
