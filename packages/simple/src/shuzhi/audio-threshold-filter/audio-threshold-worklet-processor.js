/**
 * AudioWorklet 内部处理器：把输入音频按配置分帧，计算 RMS，并回传 Uint8 时域帧。
 */
class AudioThresholdProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameSize = 4096;
    this.pending = [];
    this.port.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'config' && typeof data.frameSize === 'number') {
        this.frameSize = Math.max(128, Math.floor(data.frameSize));
      }
    };
  }

  /**
   * 把 Float32(-1~1) 转为 Uint8(0~255)。
   */
  static toU8(sample) {
    const clamped = Math.max(-1, Math.min(1, sample));
    return Math.round((clamped + 1) * 127.5);
  }

  /**
   * 计算 RMS 音量。
   */
  static calculateRms(u8Frame) {
    let sum = 0;
    for (let i = 0; i < u8Frame.length; i += 1) {
      const normalized = (u8Frame[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / u8Frame.length);
  }

  /**
   * Web Audio API 的音频处理主循环，每次音频块被拉取时自动调用。
   * @param {Array} inputs - 多通道输入音频数据（这里只用inputs[0][0]，即单通道）
   * @returns {boolean} true表示保持worklet持续运行
   * 
   * 主要流程如下：
   * 1. 获取输入的单通道（假设只有一路audio输入）
   * 2. 将原始的PCM数据依次推入pending缓冲
   * 3. 只要缓冲区的数据量达到frameSize，就取出frameSize长度的数据
   *    （这样就能实现“分帧”），每一帧：
   *    a. 将Float32 PCM数据转换为Uint8（0~255）的数据
   *    b. 计算这一帧的RMS音量（归一化0~1的幅度）
   *    c. 通过port.postMessage发送给主线程，包括帧数据和RMS音量，以及该帧的时长
   * 4. 没有足够数据时积攒到下次process
   */
  process(inputs) {
    // 获取第一个音轨数据（单通道）
    const input = inputs[0];
    const channel0 = input && input[0];
    if (!channel0) return true; // 没有数据，直接返回true

    // 将每个PCM采样点推入待处理缓冲区
    for (let i = 0; i < channel0.length; i += 1) {
      this.pending.push(channel0[i]);
    }

    // 只要积累的数据超过一个frameSize，就循环分帧处理
    while (this.pending.length >= this.frameSize) {
      // 取出一帧的数据
      const chunk = this.pending.splice(0, this.frameSize);

      // 将Float32的PCM数据转换为Uint8（0~255）
      const u8Frame = new Uint8Array(chunk.length);
      for (let i = 0; i < chunk.length; i += 1) {
        u8Frame[i] = AudioThresholdProcessor.toU8(chunk[i]);
      }

      // 计算本帧的RMS音量
      const volume = AudioThresholdProcessor.calculateRms(u8Frame);

      // 通过port向主线程发送数据（带帧内容和音量等信息，帧数据做零拷贝传递）
      this.port.postMessage(
        {
          type: 'frame',  // 帧类型消息
          frame: u8Frame, // 帧的Uint8原始数据
          volume,         // 帧的音量（RMS分贝，0~1，常用于静音判定）
          frameDurationMs: (u8Frame.length / sampleRate) * 1000 // 帧时长（ms）
        },
        [u8Frame.buffer] // 结构化克隆时以零内存拷贝的方式发送buffer
      );
    }

    // 返回true，表示process继续被调用（worklet生命周期机制要求）
    return true;
  }
}

registerProcessor('audio-threshold-processor', AudioThresholdProcessor);
