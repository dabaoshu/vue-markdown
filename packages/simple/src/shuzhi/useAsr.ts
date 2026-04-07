// import { getWebSocketURL } from './../utils/env';
// import ElMessage from '@/components/message/index';
import { ref, reactive } from 'vue';
import CryptoJS from 'crypto-js';
import _ from 'lodash';
// import { isDev } from '@/utils/env';
import { AudioThresholdFilter } from './audio-threshold-filter/audio-threshold-filter';
const isDev = false;
const ElMessage: { error: (message: string) => void } = {
  error: (message: string) => {
    console.error(message);
  }
};

const getWebSocketURL = () => {
  return 'wss://ai.csg.cn/aihear-50-249';
};
/**
 * 为什么要这么处理
 *
 * Web音频API中通过AudioWorklet或ScriptProcessor获得的音频帧常为Uint8Array（0~255, 无符号）。
 * 大部分ASR（自动语音识别）服务或底层PCM协议要求采样深度为16位带符号整数（Int16，范围-32768~32767），
 * 且幅度归一化到-1~1（即通过中心化和缩放）。
 *
 * 因此，必须将Uint8格式的单声道音频帧正确映射为Int16 PCM格式再发送到ASR服务。
 *    - 0(无符号)对应Int16的最小值（-32768），255对应最大值（+32767），128为中心点（0）。
 *    - 这样做保证了不同平台、工作流的兼容性，避免出现ASR服务因格式错误导致无法识别、乱码、降噪失效等问题。
 *
 * 此外，因为不同厂商的ASR或SDK要求输入流为特定格式（如16bit单声道PCM），因此这里做统一转换成为必要的适配流程。
 */
const convertU8ToInt16 = (frame: Uint8Array): ArrayBuffer => {
  const int16Buffer = new Int16Array(frame.length);
  for (let i = 0; i < frame.length; i += 1) {
    const normalized = (frame[i] - 128) / 128;
    const clamped = Math.max(-1, Math.min(1, normalized));
    int16Buffer[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return int16Buffer.buffer;
};
/**
 * ASR Hook 配置项。
 */
interface UseAsrOptions {
  /**
   * 识别文本回调。
   */
  onTextCall: (text: string) => void;
  /**
   * 业务 appid。
   */
  appid?: string;
  /**
   * 每次向 WebSocket 发送 PCM 数据后的调试回调。
   */
  onPcmSent?: (pcmBuffer: ArrayBuffer) => void;
}

/**
 * ASR WebSocket 连接状态。
 */
type AsrConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export const useAsr = ({
  onTextCall,
  appid = 'gaixcAgentPlatform',
  onPcmSent
}: UseAsrOptions) => {
  const asrState = reactive({
    isRecording: false, // 是否录音中
    isRecordingSuccess: false, // 是否成功识别语音
    asrText: '', // asr识别完整的文字
    asrTextBuffer: '', // asr识别中的文字缓存
    query: '', //最终是被文字
    mouseUpWait: false, // asr鼠标弹起之后有1秒等待，这一秒内不允许再次操作  asr或者疯狂乱按
    touchInside: true, // 初始假设触摸点在div内
    connectionStatus: 'idle' as AsrConnectionStatus // WebSocket 连接状态
  });

  const ws = ref<WebSocket | null>(null); // 语音识别asr长连接
  const filter = ref<AudioThresholdFilter | null>(null); // 音频过滤器
  const isAuthorizationPending = ref(true); // 标志用户授权媒体访问状态
  const isManualSocketClosing = ref(false); // 标记是否为主动关闭连接

  /**
   * 设置连接状态。
   */
  const setConnectionStatus = (status: AsrConnectionStatus): void => {
    asrState.connectionStatus = status;
  };

  const initAsrSocket = () => {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const appsecret = '_7$3TN!gQ+H1WeCg|0&bAIDAf^hM!5^4zHtgfkKSOiul';
      const sign = CryptoJS.MD5(`${appid}${appsecret}${timestamp}`).toString();
      const token = `appId-${appid}#timestamp-${timestamp}#sign-${sign}`;
      let settled = false;

      setConnectionStatus('connecting');

      try {
        ws.value = new WebSocket(
          `${getWebSocketURL()}/thrid/hisee/appid=${appid},uid=test002,ack=1,pgs=on,pk_on=1,engine=ast`,
          [token]
        );

        // asr连接成功
        ws.value.onopen = () => {
          console.log('语音识别接口连接成功');
          setConnectionStatus('connected');
          if (!settled) {
            settled = true;
            resolve(true);
          }
        };

        // 长连接异常
        ws.value.onerror = (error) => {
          setConnectionStatus('error');
          ElMessage.error('智能语音识别连接失败，请稍后再试');
          console.dir('websocket 错误：' + error);
          if (!settled) {
            settled = true;
            reject(error);
          }
        };

        // 长连接关闭
        ws.value.onclose = () => {
          console.log('socket关闭');
          const manualClose = isManualSocketClosing.value;
          isManualSocketClosing.value = false;
          setConnectionStatus(manualClose ? 'idle' : 'disconnected');
          // 重置记录
          asrState.isRecordingSuccess = false;
          ws.value = null;
          if (!manualClose && !settled) {
            settled = true;
            reject('语音识别已断开');
          }
        };

        // 长连接返回数据
        ws.value.onmessage = (event) => {
          try {
            console.log('收到消息', event.data);
            const data = JSON.parse(event.data);
            handleRecognitionData(data);
          } catch (error) {
            console.error('处理消息时发生错误：', error);
          }
        };
      } catch (error) {
        setConnectionStatus('error');
        reject(error);
      }
    });
  };

  // 处理asr识别返回数据
  const handleRecognitionData = (data) => {
    if (data.msgtype === 'progressive') {
      asrState.asrTextBuffer = data.ws
        .map((i) => i.cw.map((j) => j.w).join(''))
        .join('');
      console.log('asrState.progressive', asrState.asrTextBuffer);

      asrState.query = `${asrState.asrText}${asrState.asrTextBuffer}`;
    } else if (data.msgtype === 'sentence') {
      asrState.asrTextBuffer = '';
      asrState.asrText += data.ws
        .map((i) => i.cw.map((j) => j.w).join(''))
        .join('');
      asrState.query = `${asrState.asrText}${asrState.asrTextBuffer}`;
      console.log('asrState.sentence', asrState.asrTextBuffer);
    }
    onTextCall(asrState.query);
  };

  // 向长连接发送录音文件流
  const sendRecordingData = (blob) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(blob);
    }
  };
  const timeId = ref<number | undefined>();

  /**
   * 释放过滤器资源。
   */
  const teardownFilter = (): void => {
    if (filter.value) {
      filter.value.stop();
      filter.value = null;
    }
  };

  // 开始录音
  const startRecording = _.debounce(async (event: Event) => {
    event?.preventDefault?.();
    // 录音中，禁止重复操作
    if (asrState.isRecording) return;

    if (isDev) {
      asrState.isRecording = true;
      timeId.value = window.setInterval(() => {
        asrState.query = asrState.query + '111';
        onTextCall(asrState.query);
      }, 300);
      return;
    }

    // 等待asr连接
    await initAsrSocket();
    // 检测是否处于录音状态
    if (!asrState.isRecording) {
      try {
        filter.value = new AudioThresholdFilter(
          {
            threshold: 0.011,
            bufferMs: 260,
            silenceTimeoutMs: 100,
            autoGainControl: false,
            noiseSuppression: true,
            echoCancellation: true,
            fftSize: 4096,
            targetSampleRate: 16000
          },
          {
            onSend: (sendEvent) => {
              console.log('sendEvent——AudioThresholdFilter', sendEvent.frames);
              sendEvent.frames.forEach((frame) => {
                const pcmBuffer = convertU8ToInt16(frame);
                const blob = new Blob([pcmBuffer], { type: 'audio/pcm' });
                sendRecordingData(blob);
                onPcmSent?.(pcmBuffer);
              });
            },
            onError: () => {
              ElMessage.error('智能语音识别连接失败，请稍后再试');
            }
          }
        );

        await filter.value.start();

        // 为了阻止第一次授权导致鼠标弹起无法暂停录音功能
        if (!isAuthorizationPending.value) {
          isAuthorizationPending.value = true;
          return;
        }

        asrState.isRecordingSuccess = true;
        asrState.isRecording = true;
      } catch (_error) {
        teardownFilter();
        if (ws.value) {
          isManualSocketClosing.value = true;
          ws.value.close();
          ws.value = null;
        }
      }
    }
  }, 200);

  // 停止录音
  const stopRecording = _.debounce(() => {
    if (isDev) {
      clearInterval(timeId.value);
      asrState.isRecording = false;
      return;
    }
    if (asrState.mouseUpWait) return;
    if (asrState.isRecording && !asrState.mouseUpWait) {
      asrState.mouseUpWait = true;
      // 清空录音对象
      teardownFilter();
      // 关闭长连接
      if (ws.value) {
        isManualSocketClosing.value = true;
        ws.value.close();
        ws.value = null;
      }

      // 清空问题
      asrState.query = '';
      asrState.asrText = '';
      asrState.asrTextBuffer = '';
      // 初始化取消录音状态
      asrState.isRecordingSuccess = false;
      asrState.isRecording = false;
      setTimeout(() => (asrState.mouseUpWait = false), 500);
    } else {
      if (ws.value) {
        isAuthorizationPending.value = false;
        teardownFilter();
        isManualSocketClosing.value = true;
        ws.value.close();
        ws.value = null;
      }
    }
  }, 210);

  return {
    asrState,
    startRecording,
    stopRecording
  };
};
