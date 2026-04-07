import { getWebSocketURL } from './../utils/env';
import ElMessage from '@/components/message/index';
import { ref, reactive } from 'vue';
import CryptoJS from 'crypto-js';
import _ from 'lodash';
import { isDev } from '@/utils/env';

export const useAsr = ({ onTextCall, appid = 'gaixcAgentPlatform' }) => {
  const asrState = reactive({
    isRecording: false, // 是否录音中
    isRecordingSuccess: false, // 是否成功识别语音
    asrText: '', // asr识别完整的文字
    asrTextBuffer: '', // asr识别中的文字缓存
    query: '', //最终是被文字
    mouseUpWait: false, // asr鼠标弹起之后有1秒等待，这一秒内不允许再次操作asr或者疯狂乱按
    touchInside: true // 初始假设触摸点在div内
  });

  const ws = ref(null); // 语音识别asr长连接
  const audioContext = ref(null); // 用于创建和管理音频上下文
  const stream = ref(null); // 用于存储从麦克风捕获的音频流
  const sourceNode = ref(null); // 音频源节点，连接音频流和处理节点
  const scriptProcessorNode = ref(null); // 脚本处理器节点，用于处理音频数据
  const isAuthorizationPending = ref(true); // 标志用户授权媒体访问状态

  const initAsrSocket = () => {
    return new Promise((resolve, reject) => {
      const timestamp = Date.parse(new Date());
      const appsecret = '_7$3TN!gQ+H1WeCg|0&bAIDAf^hM!5^4zHtgfkKSOiul';
      const sign = CryptoJS.MD5(`${appid}${appsecret}${timestamp}`).toString();
      const token = `appId-${appid}#timestamp-${timestamp}#sign-${sign}`;

      try {
        ws.value = new WebSocket(
          `${getWebSocketURL()}://${
            window.location.host
          }/zt/thrid/hisee/appid=${appid},uid=test002,ack=1,pgs=on,pk_on=1,engine=ast`,
          [token]
        );

        // asr连接成功
        ws.value.onopen = () => {
          console.log('语音识别接口连接成功');
          resolve(true);
        };

        // 长连接异常
        ws.value.onerror = (error) => {
          ElMessage.error('智能语音识别连接失败，请稍后再试');
          console.dir('websocket 错误：' + error);
        };

        // 长连接关闭
        ws.value.onclose = (event) => {
          console.log('socket关闭');
          // 重置记录
          asrState.isRecordingSuccess = false;
          ws.value = null;
          reject('语音识别已断开');
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
        reject();
      }
    });
  };

  // 处理asr识别返回数据
  const handleRecognitionData = (data) => {
    if (data.msgtype === 'progressive') {
      asrState.asrTextBuffer = data.ws
        .map((i) => i.cw.map((j) => j.w).join(''))
        .join('');
      asrState.query = `${asrState.asrText}${asrState.asrTextBuffer}`;
    } else if (data.msgtype === 'sentence') {
      asrState.asrTextBuffer = '';
      asrState.asrText += data.ws
        .map((i) => i.cw.map((j) => j.w).join(''))
        .join('');
      asrState.query = `${asrState.asrText}${asrState.asrTextBuffer}`;
    }
    onTextCall(asrState.query);
  };

  // 向长连接发送录音文件流
  const sendRecordingData = (blob) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(blob);
    }
  };
  const timeId = ref();
  // 开始录音
  const startRecording = _.debounce(async (event) => {
    event.preventDefault();
    // 录音中，禁止重复操作
    if (asrState.isRecording) return;

    if (true && isDev) {
      asrState.isRecording = true;
      timeId.value = setInterval(() => {
        asrState.query = asrState.query + '111';
        onTextCall(asrState.query);
      }, 300);
      return;
    }

    // 等待asr连接
    await initAsrSocket();
    // 检测是否处于录音状态
    if (!asrState.isRecording) {
      // 创建一个新的音频流上下文示例
      audioContext.value = new (window.AudioContext ||
        window.webkitAudioContext)();
      // 请求用户授权访问媒体设备，并获取音频流
      stream.value = await navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: false
        })
        .catch(() => {
          if (ws.value) {
            ws.value.close();
            ws.value = null;
          }
          return;
        });
      // 为了阻止第一次授权导致鼠标弹起无法暂停录音功能
      if (!isAuthorizationPending.value) {
        isAuthorizationPending.value = true;
        return;
      }
      // 创建音频源节点，并将其连接到媒体流
      sourceNode.value = audioContext.value.createMediaStreamSource(
        stream.value
      );
      // 创建脚本处理器节点，用于处理音频数据
      // 创建一个 ScriptProcessorNode，用于处理音频数据
      // 第一个参数 4096：缓冲区的大小，每次触发onaudioprocess事件的数据帧数，单位是采样数。数值越大，延迟越高但CPU占用越低。
      // 第二个参数 1：输入声道数量，这里是单声道（麦克风通常为单声道）。
      // 第三个参数 1：输出声道数量，这里同样是单声道输出。
      scriptProcessorNode.value = audioContext.value.createScriptProcessor(
        4096, // bufferSize: 处理块大小
        1,    // numberOfInputChannels: 输入声道数
        1     // numberOfOutputChannels: 输出声道数
      );
      // 音频调用成功记录，用于创建一条空记录
      asrState.isRecordingSuccess = true;
      // 为脚本处理器节点设置音频处理事件
      scriptProcessorNode.value.onaudioprocess = (event) => {
        // 获取输入缓冲区的音频数据
        const inputBuffer = event.inputBuffer.getChannelData(0);
        // 对音频数据进行降采样处理
        const downsampledBuffer = downsampleBuffer(
          inputBuffer,
          audioContext.value.sampleRate,
          16000
        );
        // 将降采样后的音频数据从Float32Array转换为Int16Array
        const buffer = convertFloat32ToInt16(downsampledBuffer);
        // 创建Blob对象，包含转换后的音频数据
        const blob = new Blob([buffer], { type: 'audio/pcm' });
        // 发送录音数据到asr服务
        sendRecordingData(blob);
      };
      // 连接音频源节点到脚本处理器节点
      sourceNode.value.connect(scriptProcessorNode.value);
      // 连接脚本处理器节点到音频上下文的输出，以便能够听到录音
      scriptProcessorNode.value.connect(audioContext.value.destination);
      // 更新录音状态为true
      asrState.isRecording = true;
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
      sourceNode.value.disconnect(scriptProcessorNode.value);
      scriptProcessorNode.value.disconnect(audioContext.value.destination);
      scriptProcessorNode.value.onaudioprocess = null;
      audioContext.value.close().then(() => {
        // 关闭长连接
        if (ws.value) {
          ws.value.close();
          ws.value = null;
        }
      });

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
        ws.value.close();
        ws.value = null;
      }
    }
  }, 210);

  // 降采样
  const downsampleBuffer = (buffer, sampleRate, outSampleRate) => {
    // 如果输出采样率等于输入采样率，直接返回原始缓冲区
    if (outSampleRate === sampleRate) {
      return buffer;
    }
    // 如果输出采样率大于输入采样率，抛出错误
    if (outSampleRate > sampleRate) {
      throw 'downsampling rate show be smaller than original sample rate';
    }
    // 计算采样率比例
    const sampleRateRatio = sampleRate / outSampleRate;
    // 计算新的缓冲区长度
    const newLength = Math.round(buffer.length / sampleRateRatio);
    // 创建新的Float32Array用于存储降采样后的数据
    const result = new Float32Array(newLength);
    // 初始化偏移量
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (
        let i = offsetBuffer;
        i < nextOffsetBuffer && i < buffer.length;
        i++
      ) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  // 将Float32Array转换为Int16Array
  const convertFloat32ToInt16 = (buffer) => {
    const int16Buffer = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Buffer.buffer;
  };

  return {
    asrState,
    startRecording,
    stopRecording
  };
};
