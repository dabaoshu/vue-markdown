/**
 * 音频门限过滤器配置。
 */
export interface AudioThresholdFilterConfig {
  /** 音量阈值（0~1）。超过此值被判定为有声 */
  threshold: number;
  /** 静音缓冲时长，单位毫秒 */
  bufferMs: number;
  /** 从激活回落到静音的超时时间，单位毫秒 */
  silenceTimeoutMs: number;
  /** FFT 采样窗口大小 */
  fftSize: number;
  /** 是否开启噪声抑制 */
  noiseSuppression: boolean;
  /** 是否开启回声消除 */
  echoCancellation: boolean;
  /** 是否开启自动增益控制，建议 false */
  autoGainControl: boolean;
  /**
   * 输出目标采样率（Hz）。为 0 时不降采样，帧长度与 AudioContext.sampleRate 一致。
   * 例如 ASR 常用 16000，可设为 16000；必须小于当前输入采样率才会生效。
   */
  targetSampleRate: number;
}

/**
 * 每帧监控事件。
 */
export interface AudioFrameEvent {
  /** 当前 RMS 音量 */
  volume: number;
  /** 当前帧原始波形 */
  frame: Uint8Array;
  /** 当前是否处于激活态 */
  isActive: boolean;
  /** 当前缓冲帧数 */
  bufferFrameCount: number;
}

/**
 * 状态切换事件。
 */
export interface AudioStateEvent {
  /** 是否激活 */
  isActive: boolean;
  /** 切换时音量 */
  volume: number;
}

/**
 * 发送事件。
 */
export interface AudioSendEvent {
  /** 本次发送的音频帧列表 */
  frames: Uint8Array[];
  /** 当前触发音量 */
  volume: number;
  /** 发送原因 */
  reason: 'buffer_flush' | 'active_frame';
}

/**
 * 噪声校准结果。
 */
export interface NoiseCalibrationResult {
  /** 采样均值 */
  averageNoise: number;
  /** 推荐阈值 */
  recommendedThreshold: number;
}

/**
 * 音频门限过滤器回调集合。
 */
export interface AudioThresholdFilterHooks {
  /** 每帧回调 */
  onFrame?: (event: AudioFrameEvent) => void;
  /** 状态切换回调 */
  onStateChange?: (event: AudioStateEvent) => void;
  /** 发送回调 */
  onSend?: (event: AudioSendEvent) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/**
 * ASR 音频包格式。
 */
export interface AsrAudioPacket {
  /** 固定消息类型 */
  type: 'audio_chunk';
  /** 发送时间戳 */
  timestamp: number;
  /** 采样率 */
  sampleRate: number;
  /** 编码格式 */
  encoding: 'pcm_u8_timeseries';
  /** 触发音量 */
  volume: number;
  /** 发送原因 */
  reason: 'buffer_flush' | 'active_frame';
  /** Base64 音频帧数组 */
  frames: string[];
}

/**
 * 通用发送器接口。
 */
export interface AsrPacketSender {
  /**
   * 发送 ASR 音频包。
   */
  send(packet: AsrAudioPacket): void | Promise<void>;
}

/**
 * WebSocket 发送器配置。
 */
export interface WebSocketAsrSenderOptions {
  /** WebSocket 地址 */
  url: string;
  /** 可选子协议 */
  protocols?: string | string[];
}
