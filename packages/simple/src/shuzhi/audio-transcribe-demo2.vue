<template>
  <div class="audio-debug-page">
    <h2>数智人语音转写 Demo</h2>
    <p class="desc">使用 `useAsr.ts` 进行 WebSocket 流式转写</p>

    <div class="panel">
      <div class="row">
        <button class="btn primary" :disabled="asrState.isRecording" @click="handleStartRecording">
          开始录音
        </button>
        <button class="btn" :disabled="!asrState.isRecording" @click="handleStopRecording">
          停止录音
        </button>
        <span class="status-badge" :class="`status-${asrState.connectionStatus}`">
          连接状态：{{ getConnectionStatusText(asrState.connectionStatus) }}
        </span>
      </div>
    </div>

    <div class="panel">
      <div class="canvas-title">识别结果</div>
      <div class="asr-result">{{ asrState.query || '等待识别...' }}</div>
    </div>

    <div class="panel">
      <div class="canvas-title">试读文本</div>
      <div class="trial-text">{{ trialReadText }}</div>
      <div class="row">
        <button class="btn" @click="handleCopyTrialText">
          复制文本
        </button>
      </div>
    </div>

    <div class="panel">
      <div class="canvas-title">WS 发送音频调试回放</div>
      <div class="row">
        <button class="btn" :disabled="!debugAudioUrl" @click="handleClearDebugAudio">
          清空调试音频
        </button>
      </div>
      <audio v-if="debugAudioUrl" class="player" :src="debugAudioUrl" controls></audio>
      <div v-else class="desc">暂无调试音频，请先录一段并停止。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useAsr } from './useAsr';

const DEBUG_SAMPLE_RATE = 16000;
const PCM_BYTES_PER_SAMPLE = 2;
const WAV_HEADER_SIZE = 44;
const trialReadText = '今天的天气很好，我们一起测试语音识别系统。请保持正常语速，清晰朗读这一段内容。';
const debugPcmChunks = ref<ArrayBuffer[]>([]);
const debugAudioUrl = ref('');

/**
 * useAsr demo：只负责调用开始/停止识别，并展示 asrState.query。
 */
const { asrState, startRecording, stopRecording } = useAsr({
  onTextCall: (text: string) => {
    console.log('text', text);
    asrState.query = text;
  },
  onPcmSent: (pcmBuffer: ArrayBuffer) => {
    debugPcmChunks.value.push(pcmBuffer.slice(0));
  }
});

/**
 * 向 DataView 写入 4 字节 ASCII 标记。
 */
function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

/**
 * 把发送到 WS 的 PCM 帧打包为可播放 WAV。
 */
function buildDebugWavBlob(chunks: ArrayBuffer[]): Blob | null {
  if (!chunks.length) return null;
  const pcmByteLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const wavBuffer = new ArrayBuffer(WAV_HEADER_SIZE + pcmByteLength);
  const view = new DataView(wavBuffer);
  const wavU8 = new Uint8Array(wavBuffer);
  const byteRate = DEBUG_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE;

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmByteLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, DEBUG_SAMPLE_RATE, true);
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
 * 释放当前调试音频 URL。
 */
function revokeDebugAudioUrl(): void {
  if (!debugAudioUrl.value) return;
  URL.revokeObjectURL(debugAudioUrl.value);
  debugAudioUrl.value = '';
}

/**
 * 开始录音并触发识别。
 */
function resetDebugChunks(): void {
  debugPcmChunks.value = [];
}

/**
 * 开始录音并触发识别。
 */
function handleStartRecording(): void {
  revokeDebugAudioUrl();
  resetDebugChunks();
  startRecording(new MouseEvent('click', { cancelable: true }) as unknown as Event);
}

/**
 * 停止录音并结束识别。
 */
function handleStopRecording(): void {
  stopRecording();
  window.setTimeout(() => {
    const wavBlob = buildDebugWavBlob(debugPcmChunks.value);
    if (!wavBlob) return;
    revokeDebugAudioUrl();
    debugAudioUrl.value = URL.createObjectURL(wavBlob);
  }, 260);
}

/**
 * 清空调试音频与缓存。
 */
function handleClearDebugAudio(): void {
  revokeDebugAudioUrl();
  resetDebugChunks();
}

/**
 * 复制试读文本到剪贴板。
 */
async function handleCopyTrialText(): Promise<void> {
  try {
    await navigator.clipboard.writeText(trialReadText);
  } catch (error) {
    console.error('复制试读文本失败', error);
  }
}

/**
 * 获取连接状态展示文案。
 */
function getConnectionStatusText(status: string): string {
  switch (status) {
    case 'connecting':
      return '连接中';
    case 'connected':
      return '已连接';
    case 'disconnected':
      return '连接断开';
    case 'error':
      return '连接异常';
    default:
      return '未连接';
  }
}

onBeforeUnmount(() => {
  stopRecording();
  revokeDebugAudioUrl();
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

.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid #cbd5e1;
  color: #334155;
  background: #f8fafc;
}

.status-connecting {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #92400e;
}

.status-connected {
  border-color: #22c55e;
  background: #f0fdf4;
  color: #166534;
}

.status-disconnected,
.status-error {
  border-color: #ef4444;
  background: #fef2f2;
  color: #991b1b;
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

/* useAsr 识别结果展示 */
.asr-result {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  min-height: 48px;
  color: #0f172a;
  white-space: pre-wrap;
}

.trial-text {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  color: #0f172a;
  line-height: 1.7;
  margin-bottom: 12px;
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
