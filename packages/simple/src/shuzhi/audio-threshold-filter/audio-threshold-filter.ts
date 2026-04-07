import type {
  AudioThresholdFilterConfig,
  AudioThresholdFilterHooks,
  NoiseCalibrationResult
} from './audio-types';
export type {
  AudioFrameEvent,
  AudioSendEvent,
  AudioStateEvent,
  AudioThresholdFilterConfig,
  AudioThresholdFilterHooks,
  NoiseCalibrationResult
} from './audio-types';

/**
 * 默认配置对象，初始化时会使用这些默认值，保证各字段有合理初始状态。
 */
const DEFAULT_CONFIG: AudioThresholdFilterConfig = {
  threshold: 0.05, // 默认门限（适合大部分场景，可以自动校准）
  bufferMs: 100, // 静音缓冲，100ms
  silenceTimeoutMs: 500, // 激活状态下500ms无声后回到静音
  fftSize: 2048, // 默认FFT窗口：2048
  noiseSuppression: true, // 默认开启噪声抑制
  echoCancellation: true, // 默认开启回声消除
  autoGainControl: false, // 默认关闭自动增益
  targetSampleRate: 0 // 0 表示不降采样
};

/**
 * 通用音频门限过滤器类（核心主体）。
 * 依赖 Web Audio API，可在各种Web框架（原生/React/Vue）中直接用。
 */
export class AudioThresholdFilter {
  /** 当前实际运行时配置（实例属性） */
  private config: AudioThresholdFilterConfig;

  /** 回调钩子集合 */
  private hooks: AudioThresholdFilterHooks;

  /** 是否正处于采集运行中 */
  private running = false;

  /** 是否处于语音激活（非静音）状态 */
  private active = false;

  /** 缓冲音频帧的环形缓冲区，用于静音时缓存数据 */
  private ringBuffer: Uint8Array[] = [];

  /** 上一次检测到有声音（激活）的时间（时间戳，ms） */
  private lastActiveAt = 0;

  /** 当前音频输入流对象（MediaStream） */
  private stream: MediaStream | null = null;

  /** Web Audio API上下文（负责音频处理、调度） */
  private audioContext: AudioContext | null = null;

  /** AudioWorklet 节点（音频线程内做分帧和音量计算） */
  private workletNode: AudioWorkletNode | null = null;

  /** MediaStream转AudioNode的桥接节点 */
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  /** 当前帧时长（ms），由 worklet 回传 */
  private currentFrameDurationMs = 20;

  /** 噪声校准缓存 */
  private calibrateBucket: number[] | null = null;

  /** 当前 AudioContext 输入采样率（Hz），start 后写入 */
  private inputSampleRate = 44100;

  /**
   * Uint8 帧（与 Worklet 相同编码）转 Float32（约 -1~1）。
   */
  private static u8FrameToFloat32(frame: Uint8Array): Float32Array {
    const out = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i += 1) {
      out[i] = (frame[i] - 128) / 128;
    }
    return out;
  }

  /**
   * Float32（约 -1~1）转 Uint8 帧（与 Worklet 一致）。
   */
  private static float32ToU8Frame(samples: Float32Array): Uint8Array {
    const u8 = new Uint8Array(samples.length);
    for (let i = 0; i < samples.length; i += 1) {
      const clamped = Math.max(-1, Math.min(1, samples[i]));
      u8[i] = Math.round((clamped + 1) * 127.5);
    }
    return u8;
  }

  /**
   * 对 Float32 PCM 做降采样（块平均），与常见 ScriptProcessor 路径一致。
   *
   * @param buffer 输入样本
   * @param sampleRate 输入采样率
   * @param outSampleRate 目标采样率，须小于 sampleRate
   * @returns 降采样后的样本
   */
  private static downsampleFloat32Buffer(
    buffer: Float32Array,
    sampleRate: number,
    outSampleRate: number
  ): Float32Array {
    if (outSampleRate >= sampleRate || outSampleRate <= 0) {
      return buffer;
    }
    const sampleRateRatio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (
        let i = offsetBuffer;
        i < nextOffsetBuffer && i < buffer.length;
        i += 1
      ) {
        accum += buffer[i];
        count += 1;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult += 1;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  /**
   * 若配置了 targetSampleRate 且低于输入采样率，则对一帧做降采样。
   *
   * @param frame Worklet 回传的 Uint8 时域帧（按 inputSampleRate）
   * @returns { frame: 处理后的帧, frameDurationMs: 该帧时长 ms }
   */
  private applyDownsampleIfNeeded(
    frame: Uint8Array,
    payloadFrameDurationMs: number
  ): { frame: Uint8Array; frameDurationMs: number } {
    const target = this.config.targetSampleRate;
    if (
      !target ||
      target <= 0 ||
      target >= this.inputSampleRate ||
      !this.audioContext
    ) {
      return {
        frame: new Uint8Array(frame),
        frameDurationMs: payloadFrameDurationMs
      };
    }
    const floatIn = AudioThresholdFilter.u8FrameToFloat32(frame);
    const floatOut = AudioThresholdFilter.downsampleFloat32Buffer(
      floatIn,
      this.inputSampleRate,
      target
    );
    const outFrame = AudioThresholdFilter.float32ToU8Frame(floatOut);
    const frameDurationMs = (outFrame.length / target) * 1000;
    return { frame: outFrame, frameDurationMs };
  }

  /**
   * 构造函数（初始化实例），可传入自定义配置和事件钩子
   * @param config 用户自定义的过滤器配置（会合并默认配置）
   * @param hooks 用户自定义的事件钩子（回调）
   */
  constructor(
    config: Partial<AudioThresholdFilterConfig> = {},
    hooks: AudioThresholdFilterHooks = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }; // 合并默认与传入配置
    this.hooks = hooks; // 存储回调钩子
  }

  /**
   * 更新配置：将传入的部分配置合并到当前实例配置。
   * @param patch 局部config
   */
  public setConfig(patch: Partial<AudioThresholdFilterConfig>): void {
    this.config = { ...this.config, ...patch };
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'config',
        frameSize: this.config.fftSize
      });
    }
  }

  /**
   * 设置/替换事件回调集合。
   * @param hooks 新的事件钩子对象
   */
  public setHooks(hooks: AudioThresholdFilterHooks): void {
    this.hooks = hooks;
  }

  /**
   * 获取当前配置（深拷贝，防止外部修改实例配置）
   * @returns 当前完整的配置对象
   */
  public getConfig(): AudioThresholdFilterConfig {
    return { ...this.config };
  }

  /**
   * 判断过滤器是否正在采集音频。
   * @returns 采集中返回true，否则false
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * 判断过滤器当前是否处于激活（有声）状态。
   * @returns 激活返回true，静音返回false
   */
  public isActive(): boolean {
    return this.active;
  }

  /**
   * 获取当前缓冲帧数量（buffer区的帧数，用于上报状态/调试）。
   * @returns 缓冲区长度
   */
  public getBufferFrameCount(): number {
    return this.ringBuffer.length;
  }

  /**
   * 获取输入流的克隆，用于录音或其他旁路处理。
   * @returns 可独立停止的流副本；未启动时返回 null
   */
  public getInputStreamClone(): MediaStream | null {
    return this.stream ? this.stream.clone() : null;
  }

  /**
   * 启动音频采集、分析和监控循环。
   * 实际创建音频设备流、初始化分析节点等，开始实时门限检测。
   */
  public async start(): Promise<void> {
    if (this.running) return; // 防止重复启动
    try {
      // 获取用户音频流，配置硬件特性
      // 获取用户音频流，配置硬件特性
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: this.config.autoGainControl,
          noiseSuppression: this.config.noiseSuppression,
          echoCancellation: this.config.echoCancellation
        }
      });

      // 创建 Web Audio 上下文
      const audioContext = new AudioContext();

      // 由于当前实现基于 AudioWorklet，为保证通用性及更高质量，可考虑 bufferSize 配置思路
      // 参考 useAsr copy.ts (151-155): 4096 处理块大小
      // 这里不直接用 ScriptProcessor，Worklet 处理帧大小在 worklet 代码中设置；如需兼容/切换可做参数化

      // 动态加载 AudioWorklet 处理器
      await audioContext.audioWorklet.addModule(
        new URL('./audio-threshold-worklet-processor.js', import.meta.url)
      );

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(
        audioContext,
        'audio-threshold-processor',
        {
          numberOfInputs: 1,
          numberOfOutputs: 0,
          channelCount: 1
        }
      );
      workletNode.port.onmessage = (event: MessageEvent) => {
        this.handleWorkletMessage(event.data);
      };
      workletNode.port.postMessage({
        type: 'config',
        frameSize: this.config.fftSize
      });
      source.connect(workletNode);

      // 保存核心属性到实例
      this.stream = stream;
      this.inputSampleRate = audioContext.sampleRate;
      this.audioContext = audioContext;
      this.workletNode = workletNode;
      this.sourceNode = source;
      this.running = true;
      this.active = false;
      this.ringBuffer = [];
      this.lastActiveAt = 0;
    } catch (error) {
      // 捕捉启动错误，并通知用户
      this.hooks.onError?.((error as Error) || new Error('启动失败'));
      throw error;
    }
  }

  /**
   * 停止音频采集与监控，并释放相关资源与句柄。
   */
  public stop(): void {
    if (this.ringBuffer.length > 0) {
      // 停止前补发缓冲中的尾帧，避免最后一段语音被截断。
      this.hooks.onSend?.({
        frames: this.ringBuffer.map((frame) => new Uint8Array(frame)),
        volume: 0,
        reason: 'buffer_flush'
      });
    }

    // 断开音频节点连接，释放资源
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    this.workletNode?.disconnect();
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
    }
    this.workletNode = null;

    // 停止麦克风流的所有音轨
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    // 关闭音频上下文
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // 清理状态
    this.running = false;
    this.active = false;
    this.ringBuffer = [];
    this.calibrateBucket = null;
  }

  /**
   * 环境噪声自动校准。
   * 会采样一段时间的音量，自动分析并给出推荐门限，并自动应用到配置
   * @param sampleMs 校准采样时长（毫秒，默认1000ms）
   * @returns Promise，完成后携带校准结果
   */
  public async calibrateNoise(
    sampleMs = 1000
  ): Promise<NoiseCalibrationResult> {
    if (!this.workletNode || !this.running) {
      throw new Error('请先启动采集');
    }
    this.calibrateBucket = [];
    await new Promise((resolve) => setTimeout(resolve, sampleMs));
    const volumes = this.calibrateBucket;
    this.calibrateBucket = null;

    // 求平均噪声，并计算推荐阈值（限幅区间0.01~0.12，经验值*2.5）
    const averageNoise =
      (volumes || []).reduce((sum, value) => sum + value, 0) /
      Math.max(1, (volumes || []).length);
    const recommendedThreshold = Number(
      Math.min(0.12, Math.max(0.01, averageNoise * 2.5)).toFixed(3)
    );

    // 自动应用推荐阈值到配置
    this.setConfig({ threshold: recommendedThreshold });

    return {
      averageNoise,
      recommendedThreshold
    };
  }

  /**
   * 主动把当前缓冲区内所有帧发送出去，并清空缓冲。
   * 通常在语音从静音切换到激活时触发，保证声音开始前的片段不丢失。
   * @param volume 当前触发时的音量，用于回调提示
   */
  private flushBuffer(volume: number): void {
    const count = this.ringBuffer.length;
    if (count > 0) {
      // 深拷贝每一帧，防止后续被覆盖
      const frames = this.ringBuffer.map((item) => new Uint8Array(item));
      this.hooks.onSend?.({ frames, volume, reason: 'buffer_flush' });
      this.ringBuffer = []; // 清空缓冲
    }
  }

  /**
   * 处理 AudioWorklet 回传的消息。
   */
  /**
   * 处理 AudioWorklet 线程发来的消息。（用于主线程与 Worklet 通信）
   *
   * 工作原理如下：
   * - 主线程通过此方法监听来自 worklet 的消息（通常为分帧的音频数据和音量信息）。
   * - 返回消息 payload 应包括：
   *    - type: 消息类型(只处理 type==='frame')
   *    - frame: Uint8Array 单帧音频数据（如0~255的PCM）
   *    - volume: 当前帧的音量 RMS(归一化0~1)
   *    - frameDurationMs: 可选，当前帧时长，单位ms
   * - 检查 type 等条件不符则直接忽略。
   * - 根据帧数据和目标采样率决定是否降采样。
   * - 记录本帧时长。
   * - 调用 processFrame() 执行门限判定、缓冲与发送，并驱动上层事件钩子。
   *
   * @param data worklet 回传的数据包（frame/volume/frameDurationMs等）
   */
  private handleWorkletMessage(data: unknown): void {
    // 若过滤器当前未运行或无有效消息，则跳过
    if (!this.running || !data || typeof data !== 'object') return;

    // 消息结构体断言
    const payload = data as {
      type?: string;
      frame?: Uint8Array;
      volume?: number;
      frameDurationMs?: number;
    };

    // 只处理音频帧 type 类型，且保证音量与帧数据存在
    if (
      payload.type !== 'frame' ||
      !payload.frame ||
      typeof payload.volume !== 'number'
    ) {
      return;
    }

    // 如未提供帧时长，则根据采样率和帧长度自动推算(ms)
    const rawDurationMs =
      typeof payload.frameDurationMs === 'number' && payload.frameDurationMs > 0
        ? payload.frameDurationMs
        : (payload.frame.length / this.inputSampleRate) * 1000;

    // 根据目标采样率自动降采样（如有需要），以满足ASR流或传输带宽要求
    const { frame, frameDurationMs } = this.applyDownsampleIfNeeded(
      payload.frame,
      rawDurationMs
    );

    // 记录当前实际帧时长
    this.currentFrameDurationMs = frameDurationMs;

    // 进一步处理（门限判定/缓冲/下发事件等）
    this.processFrame(frame, payload.volume);
  }

  /**
   * 处理单帧数据，进行门限判定、缓冲和发送。
   */
  private processFrame(frame: Uint8Array, volume: number): void {
    // 若当前处于环境噪声校准状态，则将本帧音量值加入校准缓存池
    if (this.calibrateBucket) {
      this.calibrateBucket.push(volume);
    }

    // 记录当前采样时刻
    const now = Date.now();
    // 判断是否通过门限
    const passed = volume > this.config.threshold;
    console.log('this.active', this.active);

    if (passed) {
      // 声音通过门限判定为“激活”
      if (!this.active) {
        this.active = true;
        this.flushBuffer(volume); // 发送静音期缓存区
        this.hooks.onStateChange?.({ isActive: true, volume }); // 触发激活事件
      } else if (this.ringBuffer.length > 0) {
        // 已在激活态时，补发低于阈值期间的缓冲帧，避免语音中段断续。
        this.flushBuffer(volume);
      }
      // 更新上次激活时间
      this.lastActiveAt = now;
      // 激活状态每帧直接发送
      this.hooks.onSend?.({
        frames: [new Uint8Array(frame)],
        volume,
        reason: 'active_frame'
      });
    } else {
      // 声音未达到门限，处于静音/缓冲期
      this.ringBuffer.push(new Uint8Array(frame)); // 缓存该帧
      // 计算允许的最大缓冲帧长度
      const maxFrames = Math.max(
        1,
        Math.round(this.config.bufferMs / this.currentFrameDurationMs)
      );
      if (this.ringBuffer.length > maxFrames) {
        this.ringBuffer.shift(); // 超长则丢弃最老帧
      }

      // 判断是否需要从激活态回落到静音
      if (
        this.active &&
        now - this.lastActiveAt > this.config.silenceTimeoutMs
      ) {
        this.active = false;
        this.hooks.onStateChange?.({ isActive: false, volume });
      }
    }

    // 每帧通知上层回调当前帧数据
    this.hooks.onFrame?.({
      volume,
      frame: new Uint8Array(frame),
      isActive: this.active,
      bufferFrameCount: this.ringBuffer.length
    });
  }
}
