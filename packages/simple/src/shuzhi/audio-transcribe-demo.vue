<template>
  <div class="audio-debug-page">
    <h2>数智人语音转写收音调试 Demo</h2>
    <p class="desc">
      目标：通过关闭 AGC + 音量阈值过滤，减少远场收音。页面展示实时音量、波形和“模拟送 ASR”结果，便于调参。
    </p>

    <div class="panel">
      <div class="row">
        <button class="btn primary" :disabled="running" @click="startMonitor">
          开始采集
        </button>
        <button class="btn" :disabled="!running" @click="stopMonitor">
          停止采集
        </button>
        <button class="btn" :disabled="!running" @click="calibrateNoise">
          环境噪声校准
        </button>
        <label class="switch">
          <input v-model="enableAsrAdapter" type="checkbox" />
          启用 ASR 适配器发送
        </label>
        <label class="version-input">
          调试版本：
          <input v-model.trim="debugVersion" type="text" placeholder="如 v1.0.0-noise-low" />
        </label>
      </div>

      <div class="grid">
        <label>
          阈值 threshold：{{ threshold.toFixed(3) }}
          <input v-model.number="threshold" type="range" min="0.01" max="0.12" step="0.001" />
        </label>

        <label>
          缓冲时长（ms）：{{ bufferMs }}
          <input v-model.number="bufferMs" type="range" min="0" max="300" step="20" />
        </label>

        <label>
          静音超时（ms）：{{ silenceTimeoutMs }}
          <input v-model.number="silenceTimeoutMs" type="range" min="200" max="1200" step="100" />
        </label>
      </div>
    </div>

    <div class="metrics">
      <div class="metric-item">
        <span>当前音量 RMS</span>
        <strong>{{ currentVolume.toFixed(4) }}</strong>
      </div>
      <div class="metric-item">
        <span>门限状态</span>
        <strong :class="isActive ? 'on' : 'off'">{{ isActive ? '激活（送ASR）' : '静音（仅缓冲）' }}</strong>
      </div>
      <div class="metric-item">
        <span>已发送帧数</span>
        <strong>{{ sentFrames }}</strong>
      </div>
      <div class="metric-item">
        <span>缓冲帧数</span>
        <strong>{{ bufferFrameCount }}</strong>
      </div>
    </div>

    <div class="volume-wrap">
      <div class="volume-label">音量条</div>
      <div class="volume-bar">
        <div class="volume-current" :style="{ width: `${Math.min(currentVolume * 500, 100)}%` }" />
        <div class="volume-threshold" :style="{ left: `${Math.min(threshold * 500, 100)}%` }" />
      </div>
    </div>

    <div class="panel">
      <div class="canvas-title">实时波形（Time Domain）</div>
      <canvas ref="waveCanvasRef" width="900" height="220" />
    </div>

    <div class="panel">
      <div class="canvas-title">录音回放</div>
      <div class="record-row">
        <span>录音状态（仅过阈值）：{{ recording ? '录制中' : '未录制' }}</span>
        <span>当前版本：{{ debugVersion || '未设置' }}</span>
        <button class="btn" :disabled="!recordedAudioUrl" @click="playRecordedAudio">
          播放录音
        </button>
        <button class="btn" :disabled="recordHistory.length === 0" @click="clearRecordHistory">
          清空记录
        </button>
      </div>
      <audio ref="playbackAudioRef" class="player" :src="recordedAudioUrl || undefined" controls />
      <ul class="record-list">
        <li v-for="item in recordHistory" :key="item.id">
          <span>{{ item.time }}</span>
          <span>{{ item.version }}</span>
          <span>{{ item.sizeKb.toFixed(1) }} KB</span>
          <button class="btn" @click="selectRecord(item.id)">切换播放</button>
        </li>
      </ul>
    </div>

    <div class="panel">
      <div class="canvas-title">模拟送 ASR 日志（最近 40 条）</div>
      <ul class="log-list">
        <li v-for="item in logs" :key="item.id">
          <span>{{ item.time }}</span>
          <span>{{ item.content }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { AudioThresholdFilter } from './audio-threshold-filter/audio-threshold-filter';

interface AsrLog {
  id: number;
  time: string;
  content: string;
}

interface DebugRecordItem {
  id: number;
  time: string;
  version: string;
  audioUrl: string;
  sizeKb: number;
}

const threshold = ref(0.015);
const bufferMs = ref(100);
const silenceTimeoutMs = ref(500);
const RECORD_SAMPLE_RATE = 16000;
const PCM_BYTES_PER_SAMPLE = 2;
const WAV_HEADER_SIZE = 44;
const currentVolume = ref(0);
const sentFrames = ref(0);
const logs = ref<AsrLog[]>([]);
const running = ref(false);
const isActive = ref(false);
const waveCanvasRef = ref<HTMLCanvasElement | null>(null);

const frameIdRef = ref(0);
const internalBufferFrameCount = ref(0);
const enableAsrAdapter = ref(false);
const recording = ref(false);
const recordedAudioUrl = ref('');
const playbackAudioRef = ref<HTMLAudioElement | null>(null);
const thresholdPassedPcmChunksRef = ref<ArrayBuffer[]>([]);
const debugVersion = ref('v1');
const recordHistory = ref<DebugRecordItem[]>([]);

const bufferFrameCount = computed(() => internalBufferFrameCount.value);

/**
 * 生成日志时间字符串。
 */
function formatNow(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now
      .getMilliseconds()
      .toString()
      .padStart(3, '0')}`;
}

/**
 * 追加日志并限制最大数量。
 */
function pushLog(content: string): void {
  logs.value.unshift({
    id: Date.now() + Math.random(),
    time: formatNow(),
    content
  });
  if (logs.value.length > 40) {
    logs.value = logs.value.slice(0, 40);
  }
}

/**
 * 向 DataView 写入 4 字节 ASCII 标记。
 */
function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

/**
 * Uint8 帧（0~255）转换为 Int16 PCM。
 */
function convertU8FrameToInt16Buffer(frame: Uint8Array): ArrayBuffer {
  const int16Buffer = new Int16Array(frame.length);
  for (let i = 0; i < frame.length; i += 1) {
    const normalized = (frame[i] - 128) / 128;
    const clamped = Math.max(-1, Math.min(1, normalized));
    int16Buffer[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return int16Buffer.buffer;
}

/**
 * 把收集到的 PCM 块打包为 WAV 以便回放。
 */
function buildWavBlobFromPcmChunks(chunks: ArrayBuffer[]): Blob | null {
  if (!chunks.length) return null;
  const pcmByteLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const wavBuffer = new ArrayBuffer(WAV_HEADER_SIZE + pcmByteLength);
  const view = new DataView(wavBuffer);
  const wavU8 = new Uint8Array(wavBuffer);
  const byteRate = RECORD_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE;

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmByteLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, RECORD_SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, PCM_BYTES_PER_SAMPLE, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, pcmByteLength, true);

  let offset = WAV_HEADER_SIZE;
  for (const chunk of chunks) {
    wavU8.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * 重置仅过阈值录音缓存。
 */
function resetThresholdRecordingChunks(): void {
  thresholdPassedPcmChunksRef.value = [];
}

/**
 * 开始“仅过阈值声音”录音。
 */
function startRecord(): void {
  recordedAudioUrl.value = '';
  resetThresholdRecordingChunks();
  recording.value = true;
}

/**
 * 绘制实时波形，便于观察近场与远场差异。
 */
function drawWave(dataArray: Uint8Array): void {
  const canvas = waveCanvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const sliceWidth = canvas.width / dataArray.length;
  let x = 0;
  for (let i = 0; i < dataArray.length; i += 1) {
    const y = (dataArray[i] / 255) * canvas.height;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  ctx.stroke();
}

/**
 * 通用音频过滤器实例（可跨框架复用核心逻辑）。
 */
const filter = new AudioThresholdFilter(
  {
    threshold: threshold.value,
    bufferMs: bufferMs.value,
    silenceTimeoutMs: silenceTimeoutMs.value,
    autoGainControl: false,
    noiseSuppression: true,
    echoCancellation: true,
    targetSampleRate: RECORD_SAMPLE_RATE
  },
  {
    onFrame: (event) => {
      currentVolume.value = event.volume;
      isActive.value = event.isActive;
      internalBufferFrameCount.value = event.bufferFrameCount;
      drawWave(event.frame);
    },
    onStateChange: (event) => {
      if (event.isActive) {
        pushLog(`进入激活态（RMS=${event.volume.toFixed(4)}）`);
      } else {
        pushLog(`进入静音态（超时 ${silenceTimeoutMs.value}ms）`);
      }
    },
    onSend: (event) => {
      const frameCount = event.frames.length;
      sentFrames.value += frameCount;
      frameIdRef.value += 1;
      if (recording.value) {
        event.frames.forEach((frame) => {
          thresholdPassedPcmChunksRef.value.push(convertU8FrameToInt16Buffer(frame));
        });
      }
      if (frameCount > 1) {
        pushLog(`触发阈值，回放缓冲 ${frameCount} 帧`);
      } else {
        pushLog(`frame#${frameIdRef.value} 送ASR，RMS=${event.volume.toFixed(4)}`);
      }
      if (enableAsrAdapter.value) {
        asrHook(event);
        return;
      }
    },
    onError: (error) => {
      pushLog(`采集错误：${error.message || '未知错误'}`);
    }
  }
);

/**
 * 模拟 ASR 适配器发送逻辑，用于调试展示。
 */
function asrHook(event: { frames: Uint8Array[]; volume: number; reason: string }): void {
  const totalBytes = event.frames.reduce((sum, frame) => sum + frame.byteLength, 0);
  pushLog(
    `ASR适配发送：原因=${event.reason}，帧数=${event.frames.length}，大小=${(
      totalBytes / 1024
    ).toFixed(1)}KB，RMS=${event.volume.toFixed(4)}`
  );
}

/**
 * 结束录音。
 */
function stopRecord(): void {
  if (!recording.value) return;
  recording.value = false;
  if (thresholdPassedPcmChunksRef.value.length === 0) {
    pushLog('录音结束：未采集到过阈值声音片段');
    return;
  }

  const blob = buildWavBlobFromPcmChunks(thresholdPassedPcmChunksRef.value);
  resetThresholdRecordingChunks();
  if (!blob) {
    pushLog('录音结束：未生成可回放音频');
    return;
  }

  const url = URL.createObjectURL(blob);
  const version = debugVersion.value || '未命名版本';
  const record: DebugRecordItem = {
    id: Date.now() + Math.random(),
    time: formatNow(),
    version,
    audioUrl: url,
    sizeKb: blob.size / 1024
  };
  recordHistory.value.unshift(record);
  if (recordHistory.value.length > 30) {
    const removed = recordHistory.value.pop();
    if (removed) {
      URL.revokeObjectURL(removed.audioUrl);
    }
  }
  recordedAudioUrl.value = url;
  pushLog(`录音完成（仅过阈值声音）：版本=${version}，大小 ${record.sizeKb.toFixed(1)} KB`);
}

/**
 * 播放当前录音。
 */
function playRecordedAudio(): void {
  if (!recordedAudioUrl.value || !playbackAudioRef.value) return;
  playbackAudioRef.value.currentTime = 0;
  void playbackAudioRef.value.play();
}

/**
 * 选择某条历史录音进行回放。
 */
function selectRecord(recordId: number): void {
  const target = recordHistory.value.find((item) => item.id === recordId);
  if (!target) return;
  recordedAudioUrl.value = target.audioUrl;
  pushLog(`已切换回放：${target.version}`);
  playRecordedAudio();
}

/**
 * 清空调试录音记录。
 */
function clearRecordHistory(): void {
  recordHistory.value.forEach((item) => {
    URL.revokeObjectURL(item.audioUrl);
  });
  recordHistory.value = [];
  recordedAudioUrl.value = '';
  pushLog('已清空录音调试记录');
}

/**
 * 启动采集：禁用 AGC，保留降噪与回声消除。
 */
async function startMonitor(): Promise<void> {
  if (running.value) return;
  try {
    await filter.start();
    running.value = true;
    sentFrames.value = 0;
    internalBufferFrameCount.value = 0;
    isActive.value = false;
    pushLog('已启动采集（AGC=off）');
    startRecord();
    pushLog('已开始录音');
  } catch (error) {
    pushLog(`启动失败：${(error as Error)?.message || '未知错误'}`);
  }
}

/**
 * 停止采集并释放音频资源。
 */
function stopMonitor(): void {
  filter.stop();
  stopRecord();
  running.value = false;
  isActive.value = false;
  internalBufferFrameCount.value = 0;
  pushLog('已停止采集');
}

/**
 * 采集 1 秒环境噪声并自动设置阈值（噪声均值 * 2.5，上限 0.12）。
 */
async function calibrateNoise(): Promise<void> {
  if (!running.value) {
    pushLog('请先开始采集后再校准');
    return;
  }

  pushLog('开始环境噪声校准（1秒）');
  try {
    const result = await filter.calibrateNoise(1000);
    threshold.value = result.recommendedThreshold;
    pushLog(
      `校准完成：噪声均值=${result.averageNoise.toFixed(4)}，阈值设为 ${threshold.value.toFixed(3)}`
    );
  } catch (error) {
    pushLog(`校准失败：${(error as Error)?.message || '未知错误'}`);
  }
}

/**
 * 同步参数到过滤器实例。
 */
watch([threshold, bufferMs, silenceTimeoutMs], () => {
  if (!running.value) {
    return;
  }
  filter.setConfig({
    threshold: threshold.value,
    bufferMs: bufferMs.value,
    silenceTimeoutMs: silenceTimeoutMs.value
  });
});

onBeforeUnmount(() => {
  stopMonitor();
  clearRecordHistory();
});
</script>

<style scoped>
.audio-debug-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 24px;
  color: #0f172a;
}

.desc {
  margin: 8px 0 16px;
  color: #334155;
}

.panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #334155;
}

.version-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.version-input input {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 4px 8px;
  min-width: 180px;
}

.record-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.player {
  width: 100%;
}

.record-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-list li {
  display: grid;
  grid-template-columns: 1.3fr 1fr 0.7fr auto;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 6px;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.btn.primary {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
}

.metrics {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.metric-item {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-item strong {
  font-size: 20px;
}

.metric-item .on {
  color: #16a34a;
}

.metric-item .off {
  color: #64748b;
}

.volume-wrap {
  margin-bottom: 16px;
}

.volume-label {
  margin-bottom: 6px;
}

.volume-bar {
  position: relative;
  height: 16px;
  border-radius: 8px;
  background: #e2e8f0;
  overflow: hidden;
}

.volume-current {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #eab308, #ef4444);
  transition: width 0.08s linear;
}

.volume-threshold {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #111827;
}

.canvas-title {
  margin-bottom: 8px;
}

canvas {
  width: 100%;
  border-radius: 8px;
  background: #0f172a;
}

.log-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 300px;
  overflow: auto;
}

.log-list li {
  display: flex;
  gap: 12px;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}
</style>
