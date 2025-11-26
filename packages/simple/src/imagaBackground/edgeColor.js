

const DEFAULTS = {
  blurRadius: 30,      // 模糊半径（像素）
  sampleStep: 4,       // 采样步长（像素）
  algorithm: 'mode',    // 算法类型：'mean' | 'median' | 'mode'
  x: 0,
  y: 0
};

/**
 * 填充倍数常量（用于计算画布填充大小）
 * @type {number}
 */
const PADDING_MULTIPLIER = 2;

/**
 * RGB通道索引
 * @type {Array<number>}
 */
const RGB_CHANNELS = [0, 1, 2];

/**
 * 将源图像转换为 ImageBitmap
 * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap} source - 源图像
 * @returns {Promise<ImageBitmap>} ImageBitmap 对象
 */
async function convertToImageBitmap(source) {
  if (source instanceof ImageBitmap) {
    return source;
  }
  if (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement) {
    return await createImageBitmap(source);
  }
  throw new Error('不支持的图像源类型');
}

/**
 * 对画布应用模糊效果
 * @param {OffscreenCanvasRenderingContext2D} ctx - 画布上下文
 * @param {number} blurRadius - 模糊半径
 * @returns {Promise<void>}
 */
async function applyBlurFilter(ctx, blurRadius) {
  const filterSupported = typeof ctx.filter !== 'undefined';

  if (filterSupported) {
    // 现代浏览器：直接应用滤镜
    ctx.filter = `blur(${blurRadius}px)`;
    const blurredBitmap = await createImageBitmap(ctx.canvas.transferToImageBitmap());
    ctx.drawImage(blurredBitmap, 0, 0);
    blurredBitmap.close();
  } else {
    // 降级方案：先导出再重新绘制
    const tempBitmap = await createImageBitmap(ctx.canvas.transferToImageBitmap());
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.filter = `blur(${blurRadius}px)`;
    ctx.drawImage(tempBitmap, 0, 0);
    tempBitmap.close();
  }
}

/**
 * 从图像数据中采样边缘像素
 * @param {ImageData} imageData - 图像数据
 * @param {number} padding - 填充大小（用于判断边缘区域）
 * @param {number} sampleStep - 采样步长
 * @returns {Array<Array<number>>} RGB 样本数组
 */
function sampleEdgePixels(imageData, padding, sampleStep) {
  const { data, width, height } = imageData;
  const samples = [];
  const minX = padding;
  const maxX = width - padding;
  const minY = padding;
  const maxY = height - padding;

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      // 只采样边缘区域（排除中心区域）
      const isEdgePixel = x <= minX || x >= maxX || y <= minY || y >= maxY;
      if (!isEdgePixel) continue;

      const pixelIndex = (y * width + x) * 4;
      samples.push([data[pixelIndex], data[pixelIndex + 1], data[pixelIndex + 2]]);
    }
  }

  return samples;
}

/**
 * 使用平均值算法计算代表色
 * @param {Array<Array<number>>} samples - RGB 样本数组
 * @returns {Array<number>} RGB 值数组
 */
function calculateMeanColor(samples) {
  const sampleCount = samples.length;
  const sum = samples.reduce(
    (acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b],
    [0, 0, 0]
  );
  return sum.map(channel => Math.round(channel / sampleCount));
}

/**
 * 使用中位数算法计算代表色
 * @param {Array<Array<number>>} samples - RGB 样本数组
 * @returns {Array<number>} RGB 值数组
 */
function calculateMedianColor(samples) {
  const sampleCount = samples.length;
  const medianIndex = Math.floor(sampleCount / 2);

  return RGB_CHANNELS.map(channelIndex => {
    const sortedChannel = samples
      .map(sample => sample[channelIndex])
      .sort((a, b) => a - b);
    return sortedChannel[medianIndex];
  });
}

/**
 * 使用众数算法计算代表色
 * @param {Array<Array<number>>} samples - RGB 样本数组
 * @returns {Array<number>} RGB 值数组
 */
function calculateModeColor(samples) {
  const frequencyMap = new Map();
  let mostFrequentColor = null;
  let maxFrequency = 0;

  for (const [r, g, b] of samples) {
    // 使用数字键而非字符串，提高性能
    const key = (r << 16) | (g << 8) | b;
    const frequency = (frequencyMap.get(key) || 0) + 1;
    frequencyMap.set(key, frequency);

    if (frequency > maxFrequency) {
      maxFrequency = frequency;
      mostFrequentColor = [r, g, b];
    }
  }

  return mostFrequentColor;
}

/**
 * 根据指定算法计算代表色
 * @param {Array<Array<number>>} samples - RGB 样本数组
 * @param {string} algorithm - 算法类型
 * @returns {Array<number>} RGB 值数组
 */
function calculateRepresentativeColor(samples, algorithm) {
  switch (algorithm) {
    case 'mean':
      return calculateMeanColor(samples);
    case 'median':
      return calculateMedianColor(samples);
    case 'mode':
      return calculateModeColor(samples);
    default:
      throw new Error(`不支持的算法类型: ${algorithm}`);
  }
}

/**
 * 验证配置参数
 * @param {Object} options - 配置选项
 * @throws {Error} 如果参数无效
 */
function validateOptions(options) {
  if (options.blurRadius <= 0) {
    throw new Error('blurRadius 必须大于 0');
  }
  if (options.sampleStep <= 0) {
    throw new Error('sampleStep 必须大于 0');
  }
  if (!['mean', 'median', 'mode'].includes(options.algorithm)) {
    throw new Error(`algorithm 必须是 'mean'、'median' 或 'mode' 之一`);
  }
}

/**
 * 从图片/画布的边缘模糊区域提取代表色
 * 
 * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap} source - 源图像
 * @param {Object} [options={}] - 配置选项
 * @param {number} [options.blurRadius=30] - 模糊半径（像素）
 * @param {number} [options.sampleStep=4] - 采样步长（像素）
 * @param {string} [options.algorithm='mode'] - 算法类型：'mean'（平均值）、'median'（中位数）、'mode'（众数）
 * @param {number} [options.x=0] - x坐标
 * @param {number} [options.y=0] - y坐标
 * @param {number} [options.width=0] - 宽度
 * @param {number} [options.height=0] - 高度
 * @returns {Promise<string>} RGB 颜色字符串，格式：'rgb(r, g, b)'
 * @throws {Error} 如果无法提取边缘样本或参数无效
 * 
 * @example
 * const img = document.querySelector('img');
 * const color = await getEdgeColor(img, { algorithm: 'mean' });
 * console.log(color); // 'rgb(255, 128, 64)'
 */
async function getEdgeColor(source, options = {}) {
  // 合并默认配置
  const config = { ...DEFAULTS, ...options };

  // 验证参数
  validateOptions(config);

  const { blurRadius, sampleStep, algorithm } = config;
  let imageBitmap = null;

  try {
    // 1. 统一转换为 ImageBitmap
    imageBitmap = await convertToImageBitmap(source);

    // 2. 创建带填充的画布用于模糊处理
    const padding = blurRadius * PADDING_MULTIPLIER;
    const canvas = new OffscreenCanvas(
      imageBitmap.width + padding * 2,
      imageBitmap.height + padding * 2
    );
    const ctx = canvas.getContext('2d');

    // 将图像居中绘制到画布上
    ctx.drawImage(imageBitmap, padding, padding);

    // 3. 应用模糊滤镜
    await applyBlurFilter(ctx, blurRadius);

    // 4. 采样边缘像素
    const imageData = ctx.getImageData(
      config.x,
      config.y,
      config.width || canvas.width,
      config.height || canvas.height
    );


    const samples = sampleEdgePixels(imageData, padding, sampleStep);

    if (samples.length === 0) {
      throw new Error('无法提取边缘样本，请检查图像尺寸和采样参数');
    }


    // 5. 根据算法计算代表色
    const rgb = calculateRepresentativeColor(samples, algorithm);

    return `rgb(${rgb.join(',')})`;
  } finally {
    // 确保释放 GPU 内存
    if (imageBitmap) {
      imageBitmap.close();
    }
  }
}

export { getEdgeColor };