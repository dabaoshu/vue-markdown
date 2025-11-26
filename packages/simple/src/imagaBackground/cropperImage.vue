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

    <div @click="handleComputedColor">图片处理</div>
    <div class="cropper-wrapper">
      <img :src="img2Src" alt="img2Src" />
    </div>
    <!-- 加载提示 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>正在处理图片...</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted, reactive, onBeforeUnmount } from 'vue';
  import Cropper from 'cropperjs';
  import type { CropperImage } from 'cropperjs';
  import { getEdgeColor } from './edgeColor.js';
  import bcg from './bcg2.jpg';
  import _ from 'lodash';
  /**
   * 组件属性定义
   */
  interface Props {
    /** 容器宽度 */
    width?: string | number;
    /** 容器高度 */
    height?: string | number;
    /** 裁剪框的宽高比 */
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
  const imageSrc = ref<string>('');
  const img2Src = ref<string>('');
  const BoxbackgroundColor = ref<string[]>(['', '']);
  const backgroundColor = ref<string>('');
  const loading = ref<boolean>(false);
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
    imageSrc.value = bcg;
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
  const getOrCreatePlaceholder = (
    cropperImage: CropperImage,
    cropperCanvas: HTMLElement
  ): HTMLDivElement => {
    if (!placeholderElement) {
      // 创建占位元素，设置与图片相同的尺寸
      placeholderElement = document.createElement('div');
      placeholderElement.style.position = 'absolute';
      placeholderElement.style.width = `${cropperImage.offsetWidth}px`;
      placeholderElement.style.height = `${cropperImage.offsetHeight}px`;
      placeholderElement.style.opacity = '0';
      placeholderElement.style.pointerEvents = 'none';
      placeholderElement.style.visibility = 'hidden';
      cropperCanvas.appendChild(placeholderElement);
    }
    return placeholderElement;
  };

  const imgTransform = (e: CustomEvent) => {
    const cropperCanvas = cropperInstance.getCropperCanvas();
    const cropperCanvasRect = cropperCanvas.getBoundingClientRect();
    const cropperImage = cropperInstance.getCropperImage();

    // 使用占位元素替代克隆节点，避免重复加载图片资源
    const placeholder = getOrCreatePlaceholder(cropperImage, cropperCanvas);
    // 更新占位元素的尺寸（图片可能被缩放）
    placeholder.style.width = `${cropperImage.offsetWidth}px`;
    placeholder.style.height = `${cropperImage.offsetHeight}px`;
    // 应用相同的变换矩阵
    placeholder.style.transform = `matrix(${e.detail.matrix.join(',')})`;
    // 获取变换后的边界矩形
    const cropperImageRect = placeholder.getBoundingClientRect();

    // 得到图片在画布上的相对位置（优先计算，确保位置更新及时）
    const imageRelativePos = getRelativePosition(
      cropperImageRect,
      cropperCanvasRect
    );
    // 限制上下高度
    if (
      cropperImageRect.top > cropperCanvasRect.top ||
      cropperImageRect.bottom < cropperCanvasRect.bottom
    ) {
      e.detail.matrix[4] = e.detail.oldMatrix[4];
      e.detail.matrix[5] = e.detail.oldMatrix[5];
      // e.preventDefault();
      return;
    }

    // 限制左右位置
    //  左右位置需要加多50px作为缓冲边缘
    const offiset = Math.max(130, Number(props.width) * 0.6);

    if (
      cropperImageRect.right + offiset <= cropperCanvasRect.right ||
      cropperImageRect.left - offiset >= cropperCanvasRect.left
    ) {
      // console.log('攔截');
      console.log('出現左右限制');
      e.preventDefault();
    }

    if (imageRelativePos.left > 0 || imageRelativePos.right < 0) {
      console.log('出现边缘');
      // 这里开始计算边缘色彩
      console.log(styleState);
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
    // 将canvas内容转换为blob对象，并下载为图片文件
    canvas.toBlob((blob: Blob | null) => {
      if (!blob) {
        console.error('canvas转blob失败');
        return;
      }
      // 创建一个临时的下载链接
      const url = URL.createObjectURL(blob);
      img2Src.value = url;
    });
  };

  const handleComputedColor = _.debounce(_handleComputedColor, 1500);

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
    // 销毁旧实例
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
    // 清理旧的占位元素matrix(0.123748, 0, 0, 0.123748, -402, -1225);
    //matrix(0, 0, 0, 0, 0, 0);
    if (placeholderElement && placeholderElement.parentNode) {
      placeholderElement.parentNode.removeChild(placeholderElement);
      placeholderElement = null;
    }

    const { image, height, width } = await queryImage(imageSrc.value);

    const containerWidth = Number(props.width);
    const containerHeight = Number(props.height);

    const scaleHValue = containerHeight / height;
    const scaleWValue = containerWidth / width;
    const size = scaleHValue > scaleWValue ? 'cover' : 'contain';
    console.log('image', image, height, width, size);
    // 创建Cropper实例
    cropperInstance = new Cropper(image, {
      container: cropperContainerRef.value,
      template:
        '<cropper-canvas  style="height: 100%;" scale-step=0.03>' +
        '<cropper-image scalable  translatable initial-center-size="' +
        size +
        '">' +
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
      // 等待图片加载完成
      // transform: matrix(0.123748, 0, 0, 0.123748, -402, -1225.01);
      // 将 props 的宽高转换为数字类型
      console.log(
        'props.height',
        containerWidth / width,
        containerHeight / height,
        scaleHValue
      );
      await cropperImage.$ready();
      // const container = cropperCanvas.getBoundingClientRect();
      // const { x, y } = cropperImage.getBoundingClientRect();
      // const containerWidth = container.width;
      // 计算缩放后的图片宽度
      if (size === 'cover') {
        cropperImage.$zoom(scaleHValue - 0.03);
      }
      if (size === 'contain') {
        cropperImage.$zoom(scaleHValue + 0.1);
      }

      // 计算垂直居中所需的偏移量（高度已经填满，所以垂直偏移为0）
      // const offsetY = 0;

      // 设置变换：缩放 + 水平居中
      // $setTransform(a, b, c, d, e, f) 对应 CSS transform: matrix(a, b, c, d, e, f)
      // a, d 是缩放值，e, f 是平移值
      // cropperImage.$setTransform(
      //   scaleValue,
      //   0,
      //   0,
      //   scaleValue,
      //   offsetX,
      //   offsetY
      // );
      /** */
      setTimeout(() => {
        console.log('添加时间');

        cropperImage.addEventListener('transform', imgTransform);
      }, 2000);
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
            console.log('imageRelativePos', imageRelativePos);

            updateBoxPositions(imageRelativePos, cropperCanvasRect);
          }
        });
      });
      observer.observe(cropperImage, {
        attributes: true
      });

      // 错误处理建议：组件卸载时，应该移除监听器，防止内存泄漏
      // 可以在 onBeforeUnmount 生命周期钩子中增加对应清理逻辑
      loading.value = false;
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
