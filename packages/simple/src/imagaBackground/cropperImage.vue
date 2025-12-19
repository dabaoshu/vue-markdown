<template>
  <div class="cropper-image-container" :style="containerStyle">
    <!-- 文件上传输入区域，支持选择图片文件 -->
    <div class="box_img_background">
      <div class="boxShade"> </div>
      <div :style="containerStyle"></div>
      <div
        :ref="(v) => (styleState.leftBox = v)"
        class="leftBox"
        :style="{ background: BoxbackgroundColor[0] }"
      ></div>
      <div
        :ref="(v) => (styleState.rightBox = v)"
        class="rightBox"
        :style="{ background: BoxbackgroundColor[1] }"
      ></div>
    </div>
    <!-- 裁剪区域 -->
    <div ref="cropperContainerRef" class="cropper-wrapper"> </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted, reactive, onBeforeUnmount } from 'vue';
  import Cropper from 'cropperjs';
  import { getEdgeColor } from './edgeColor.js';
  import _ from 'lodash';
  /**
   * 组件属性定义
   */
  interface Props {
    /** 容器宽度 */
    width?: number;
    /** 容器高度 */
    height?: number;
    /** 图片地址 */
    src?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    width: 486,
    height: 346
  });

  // 响应式数据
  const cropperContainerRef = ref<HTMLDivElement | null>(null);
  const styleState = reactive<{
    leftBox: HTMLDivElement | null;
    rightBox: HTMLDivElement | null;
  }>({
    leftBox: null,
    rightBox: null
  });
  const imageSrc = ref<string>(props.src);
  const BoxbackgroundColor = ref<string[]>(['', '']);
  const backgroundColor = ref<string>('');
  const loading = ref<boolean>(false);
  const MaxMatrix = ref<number[]>([]);
  const initialCenterSize = ref('');
  let cropperInstance: Cropper | null = null;
  /** 复用的占位元素，用于计算变换后的边界矩形，避免每次克隆节点重新加载图片 */
  let placeholderElement: HTMLDivElement | null = null;

  const setBackgroundColor = (color: string) => {
    BoxbackgroundColor.value = [
      `linear-gradient(90deg, ${color} 10%, ${color} 28%, transparent 92.4%)`,
      `linear-gradient(90deg, transparent 8.6%, ${color} 72%, ${color} 90%)`
    ];
    backgroundColor.value = color;
  };
  /**
   * 容器样式计算
   */
  const containerStyle = computed(() => ({
    backgroundColor: backgroundColor.value,
    width: props.width + 'px',
    height: props.height + 'px'
  }));

  onMounted(() => {
    loading.value = true;
    // 初始化Cropper（ready回调中会再次提取颜色，确保使用Cropper处理后的图片）
    initCropper();
  });

  // 计算 image 在 canvas 内的相对位置（Top、Left、Width、Height 均为相对于 canvas 左上角的偏移量与尺寸）
  function getRelativePosition(imageRect: DOMRect, canvasRect: DOMRect) {
    // 计算相对左上角（left, top）的位置
    const left = imageRect.left - canvasRect.left;
    const top = imageRect.top - canvasRect.top;
    const width = imageRect.width;
    const height = imageRect.height;
    // 计算相对右上角的位置
    // right为 image 的右侧到 canvas 的左侧距离，再减去 canvas 的宽度就是右边距离
    const right = imageRect.right - canvasRect.left - canvasRect.width;
    // 由于top是相对于canvas的上边，这里right是距canvas右边界的距离，可用于补仓定位
    // 你可以根据实际需求返回或记录 right 参数
    return { left, top, width, height, right };
  }

  /**
   * 更新 leftBox 和 rightBox 的位置
   * @param imageRelativePos - 图片在画布上的相对位置
   * @param cropperCanvasRect - 画布的边界矩形
   */
  const updateBoxPositions = (
    imageRelativePos: ReturnType<typeof getRelativePosition>,
    cropperCanvasRect: DOMRect
  ) => {
    // 确保 leftBox 和 rightBox 已经初始化
    if (!styleState.leftBox || !styleState.rightBox) {
      return;
    }
    // 更新 leftBox 位置：图片左边缘位置 + 15px 偏移
    styleState.leftBox.style.left = imageRelativePos.left + 15 + 'px';

    // 更新 rightBox 位置：画布宽度 + 图片右边缘相对位置 - 15px 偏移
    styleState.rightBox.style.left =
      cropperCanvasRect.width + imageRelativePos.right - 15 + 'px';
  };

  /**
   * 获取或创建占位元素，用于计算变换后的边界矩形
   * @param cropperImage - 原始图片元素，用于获取尺寸
   * @param cropperCanvas - 画布容器
   * @returns 占位元素
   */
  const createPlaceholder = ({ offsetWidth, offsetHeight }) => {
    // 创建占位元素，设置与图片相同的尺寸
    placeholderElement = document.createElement('div');
    placeholderElement.style.position = 'absolute';
    placeholderElement.style.width = `${offsetWidth}px`;
    placeholderElement.style.height = `${offsetHeight}px`;
    placeholderElement.style.opacity = '0';
    placeholderElement.style.pointerEvents = 'none';
    placeholderElement.style.visibility = 'hidden';
  };

  const imgTransform = (e: CustomEvent) => {
    const cropperCanvas = cropperInstance.getCropperCanvas();
    const cropperCanvasRect = cropperCanvas.getBoundingClientRect();
    const cropperImage = cropperInstance.getCropperImage();

    // 使用占位元素替代克隆节点，避免重复加载图片资源
    placeholderElement.style.width = `${cropperImage.offsetWidth}px`;
    placeholderElement.style.height = `${cropperImage.offsetHeight}px`;
    placeholderElement.style.transform = `matrix(${e.detail.matrix.join(',')})`;

    const cropperImageRect = placeholderElement.getBoundingClientRect();
    // 得到图片在画布上的相对位置（优先计算，确保位置更新及时）

    if (initialCenterSize.value === 'cover') {
      // 限制缩放
      if (e.detail.matrix[0] < MaxMatrix.value[0]) {
        e.preventDefault();
      }
      if (
        cropperImageRect.top - 1.2 > cropperCanvasRect.top ||
        cropperImageRect.bottom + 1.2 < cropperCanvasRect.bottom
      ) {
        e.detail.matrix[5] = e.detail.oldMatrix[5];
        e.preventDefault();
      }
    }

    if (initialCenterSize.value === 'contain') {
      if (
        // 图片顶部在画布顶部之下，并且图片右侧在画布右侧之内
        (cropperImageRect.top > cropperCanvasRect.top &&
          cropperImageRect.right < cropperCanvasRect.right) ||
        // 图片顶部在画布顶部之下,并且图片左侧在画布左侧之右，
        (cropperImageRect.top > cropperCanvasRect.top &&
          cropperImageRect.left > cropperCanvasRect.left) ||
        // 或者图片右侧在画布右侧之内，并且图片底部在画布底部之上
        (cropperImageRect.bottom < cropperCanvasRect.bottom &&
          cropperImageRect.right < cropperCanvasRect.right) ||
        // 或者图片底部在画布底部之上，并且图片左侧在画布左侧之右
        (cropperImageRect.bottom < cropperCanvasRect.bottom &&
          cropperImageRect.left > cropperCanvasRect.left)
      ) {
        if (
          e.detail.matrix[0] === MaxMatrix.value[0] &&
          e.detail.matrix[3] === MaxMatrix.value[3]
        ) {
          e.detail.matrix[5] = MaxMatrix.value[5];
        } else if (e.detail.matrix[3] > MaxMatrix.value[3]) {
          (e.target as HTMLElement).setAttribute(
            'data-scale',
            e.detail.matrix[3]
          );
          e.preventDefault();
        } else {
          // 阻止图片变换（例如拖拽、缩放），保证图片始终在画布内部
          e.preventDefault();
        }
      }
    }

    // 限制左右位置
    //  左右位置需要加多50px作为缓冲边缘
    const offset = props.width * 0.45;
    const leftDiff = cropperImageRect.left - cropperCanvasRect.left > offset;
    const rightDiff =
      cropperCanvasRect.right - cropperImageRect.right - offset > 0;

    if (leftDiff || rightDiff) {
      // 阻止图片变换（例如拖拽、缩放），保证图片始终在画布内部
      e.preventDefault();
    }

    const imageRelativePos = getRelativePosition(
      cropperImageRect,
      cropperCanvasRect
    );

    if (imageRelativePos.left > 0 || imageRelativePos.right < 0) {
      handleComputedColor();
    }
  };

  const _handleComputedColor = async () => {
    const cropperCanvas = cropperInstance.getCropperCanvas();
    // 将canvas生成的图片进行下载
    const canvas: HTMLCanvasElement = await cropperCanvas.$toCanvas();

    if (!canvas) {
      console.error('生成canvas失败');
      return;
    }

    const color = await getEdgeColor(canvas, { algorithm: 'median' });

    setBackgroundColor(color);
  };

  const handleComputedColor = _.debounce(_handleComputedColor, 500);

  /**
   * 初始化Cropper实例
   */
  async function initCropper() {
    const queryImage = async (imageSrc: string) => {
      return new Promise<{
        width: number;
        height: number;
        image: HTMLImageElement;
      }>((resolve, reject) => {
        const image = new Image();
        image.src = imageSrc;
        image.alt = 'Picture';
        image.onload = () => {
          var width = image.naturalWidth;
          var height = image.naturalHeight;
          resolve({ width, height, image });
        };
        image.onerror = () => {
          reject(new Error('图片加载失败'));
        };
      });
    };

    // 清理旧的占位元素matrix(0.123748, 0, 0, 0.123748, -402, -1225);
    //matrix(0, 0, 0, 0, 0, 0);
    if (placeholderElement && placeholderElement.parentNode) {
      placeholderElement.parentNode.removeChild(placeholderElement);
      placeholderElement = null;
    }

    const { image, height, width } = await queryImage(imageSrc.value);

    const scaleHValue = props.height / height;
    const scaleWValue = props.width / width;
    initialCenterSize.value = scaleHValue > scaleWValue ? 'cover' : 'contain';
    // 创建Cropper实例
    cropperInstance = new Cropper(image, {
      container: cropperContainerRef.value,
      template:
        '<cropper-canvas  style="height: 100%;" scale-step=0.03>' +
        `<cropper-image scalable  translatable initial-center-size="${initialCenterSize.value}" >` +
        '</cropper-image>' +
        '<cropper-shade hide ></cropper-shade>' +
        '<cropper-selection initial-coverage="1" x="0" y="0" >' +
        '<cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.001)"></cropper-handle>' +
        '</cropper-selection>' +
        '</cropper-canvas>'
    });

    try {
      const cropperImage = cropperInstance.getCropperImage();
      const cropperCanvas = cropperInstance.getCropperCanvas();
      createPlaceholder(cropperImage);
      cropperCanvas.appendChild(placeholderElement);
      // 等待图片加载完成

      await cropperImage.$ready();
      _handleComputedColor();

      const a = (e) => {
        MaxMatrix.value = e.detail.matrix;
      };
      cropperImage.addEventListener('transform', a);
      cropperCanvas.addEventListener('action', (e) => {
        if (
          initialCenterSize.value === 'contain' &&
          e.detail.action === 'scale' &&
          cropperImage.getAttribute('data-scale')
        ) {
          const dtScale = cropperImage.getAttribute('data-scale');
          const newMaxMatrix = MaxMatrix.value;
          newMaxMatrix[0] = Number(dtScale);
          newMaxMatrix[3] = Number(dtScale);
          cropperImage.$setTransform(newMaxMatrix);
          cropperImage.removeAttribute('data-scale');
        }
      });

      // 为 cropperImage 添加属性监听器，监听示例属性变化（如scale、rotate等）
      // 注意：具体可监听哪些属性，需参考 cropperImage 实现，这里以常见属性为例
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === 'attributes' &&
            mutation.attributeName === 'style'
          ) {
            const cropperImageRect = (
              mutation.target as HTMLElement
            ).getBoundingClientRect();
            const cropperCanvasRect = cropperInstance
              .getCropperCanvas()
              .getBoundingClientRect();
            const imageRelativePos = getRelativePosition(
              cropperImageRect,
              cropperCanvasRect
            );
            updateBoxPositions(imageRelativePos, cropperCanvasRect);
          }
        });
      });
      observer.observe(cropperImage, {
        attributes: true
      });


      setTimeout(() => {
        cropperImage.removeEventListener('transform', a);
        cropperImage.addEventListener('transform', imgTransform);
        loading.value = false;
      }, 300);
    } catch (error) {
      console.error('提取背景颜色失败:', error);
      loading.value = false;
    }

    // animationFrame();
  }

  onBeforeUnmount(() => {
    // 清理占位元素
    if (placeholderElement && placeholderElement.parentNode) {
      placeholderElement.parentNode.removeChild(placeholderElement);
      placeholderElement = null;
    }
    cropperInstance = null;
  });
</script>

<style lang="scss" scoped>
  .cropper-image-container {
    height: 346px;
    position: relative;
    border: 2px dashed #d9d9d9;
    border-radius: 8px;
  }
  .box_img_background {
    pointer-events: none;
    position: absolute;
    width: 100%;
    height: 100%;
  }
  .boxShade {
    width: 100%;
    position: absolute;
    height: 100%;
    z-index: 90;
    background-color: rgba(0, 0, 0, 0.12);
  }

  .leftBox {
    position: absolute;
    height: 100%;
    width: 10%;
    z-index: 9;
    top: 0;
    transform: translate(-50%, 0);
  }
  .rightBox {
    position: absolute;
    height: 100%;
    width: 10%;
    z-index: 9;
    top: 0;
    transform: translate(-50%, 0);
  }

  .cropper-wrapper {
    overflow: hidden;
    width: 100%;
    height: 100%;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      opacity: 0.8;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }

    &.btn-primary {
      background-color: #1890ff;
      color: #fff;

      &:hover {
        background-color: #40a9ff;
      }
    }

    &.btn-secondary {
      background-color: #f5f5f5;
      color: #333;

      &:hover {
        background-color: #e6e6e6;
      }
    }
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #1890ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 12px;
    }

    p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }
</style>

<style></style>
