import { onBeforeUnmount, reactive, ref, shallowRef } from 'vue';
import cloneDeep from 'lodash/cloneDeep';
import AvatarPlatform, {
  PlayerEvents,
  SDKEvents
} from '../avatar-sdk-web_3.1.2.1002/index.js';

const message = {
  /**
   * 内置简易提示：控制台打印并调用浏览器 alert。
   * @param msg 提示文本
   */
  success(msg: string) {
    console.log('[success]', msg);
    window?.alert?.(msg);
  },
  /**
   * 内置简易提示：控制台打印并调用浏览器 alert。
   * @param msg 提示文本
   */
  warning(msg: string) {
    console.warn('[warning]', msg);
    window?.alert?.(msg);
  },
  /**
   * 内置简易提示：控制台打印并调用浏览器 alert。
   * @param msg 提示文本
   */
  error(msg: string) {
    console.error('[error]', msg);
    window?.alert?.(msg);
  }
};

export function useAvatarSdk() {
  /**
   * 全局加载状态（主要用于 Start/连接 等异步过程）。
   */
  const loading = ref(false);
  /**
   * 初始化 SDK，仅需调用一次。
   */
  const interativeRef = shallowRef<AvatarPlatform>();

  const avatarConfigForm = reactive({
    avatar_dispatch: { interactive_mode: 0, content_analysis: 0 },
    stream: {
      protocol: 'xrtc',
      alpha: 1,
      bitrate: 1000000,
      fps: 25
    },
    avatar: {
      avatar_id: '',
      width: 720,
      height: 1280,
      mask_region: '[0, 0, 1080, 1920]',
      scale: 1,
      move_h: 0,
      move_v: 0,
      audio_format: 1
    },
    tts: {
      vcn: '',
      speed: 50,
      pitch: 50,
      volume: 100
    }
  });

  const containerEl = ref<HTMLDivElement>();

  /**
   * 文本驱动 / 交互相关配置。
   */
  const textDriverForm = reactive({
    avatar_dispatch: {
      interactive_mode: 0,
      content_analysis: 0
    },
    // text: '你好[[action=A_W_walk_left_O]]',
    tts: {
      vcn: '',
      speed: 50,
      pitch: 50,
      volume: 100
    },
    nlp: false
  });

  /**
   * 初始化函数
   * 用于创建AvatarPlatform实例并绑定交互事件
   */
  const init = ({}) => {
    // 创建AvatarPlatform实例并赋值给interativeRef.value
    interativeRef.value = new AvatarPlatform();
    // 调用SDK实例的setApiInfo方法，配置API服务参数
    interativeRef.value.setApiInfo({
      serverUrl: 'wss://avatar.cn-huadong-1.xf-yun.com/v1/interact', // WebSocket服务器地址
      appId: '', // 应用ID，用于标识应用
      apiKey: '', // API密钥，用于身份验证
      apiSecret: '', // API密钥，用于安全验证
      sceneId: '' // 场景ID，用于指定交互场景
    });
    interativeRef.value.createPlayer();
    bindInteractEvent();
    // interativeRef.value .
  };

  const bindInteractEvent = () => {
    if (!interativeRef.value) {
      return message.warning('请初始化sdk');
    }
    interativeRef.value.removeAllListeners();
    interativeRef.value
      .on(SDKEvents.connected, (initResp: any) => {
        console.log('sdk event: connected', initResp);
      })
      .on(SDKEvents.stream_start, () => {
        console.log('sdk event: stream_start');
      })
      .on(SDKEvents.disconnected, (e: any) => {
        loading.value = false;
        console.log('sdk event: disconnected');
        if (e) {
          message.error('ws link disconnected');
          console.error(e.code, e.message, e.name, e.stack);
        }
      })
      .on(SDKEvents.asr, (asrData: any) => {
        console.log('sdk event: asr', asrData);
      })
      .on(SDKEvents.nlp, (nlpData: any) => {
        console.log('sdk event: nlp', nlpData);
      })
      .on(SDKEvents.frame_start, (frameData: any) => {
        console.log('sdk event: frameBegin', frameData);
      })
      .on(SDKEvents.frame_stop, (frameData: any) => {
        console.log('sdk event: frameEnd', frameData);
      })
      .on(SDKEvents.action_start, (actionData: any) => {
        console.log('sdk event: actionBegin', actionData);
      })
      .on(SDKEvents.action_stop, (actionData: any) => {
        console.log('sdk event: actionEnd', actionData);
      })
      .on(SDKEvents.tts_duration, (sessionData: any) => {
        console.log('sdk event: duration', sessionData);
      })
      .on(SDKEvents.error, (error: any) => {
        console.log('sdk event: error', error);
      });

    message.success(
      'SDK 交互事件监听绑定成功 可以打开控制台 查看事件日志 [sdk event:]'
    );
  };

  const UnInitSDK = () => {
    interativeRef.value?.destroy();
    interativeRef.value = undefined;
    message.success('UnInitSDK成功');
  };

  const getPlayer = () => {
    const player = interativeRef.value?.player;
    console.log('player', player);
    return player;
  };

  const bindPlayerEvent = () => {
    if (!interativeRef.value) {
      return message.warning('请初始化sdk');
    }
    const player = interativeRef.value.player;
    if (!player) {
      return message.warning('当前不存在player 实例 请调用create 创建');
    }
    player.removeAllListeners();
    player
      .on(PlayerEvents.error, (err: any) => {
        console.log('sdk player event: player error', err);
        if (err?.code === '700005') {
          console.log('sdk player event: player h264 not supported');
        }
      })
      ?.on(PlayerEvents.play, () => {
        console.log('sdk player event: player play');
      })
      .on(PlayerEvents.waiting, () => {
        console.log('sdk player event: player waiting');
      })
      .on(PlayerEvents.playing, () => {
        console.log('sdk player event: player playing');
      })
      .on(PlayerEvents.playNotAllowed, () => {
        console.log(
          'sdk player event: play not allowed, muted play， player call resume after user gusture'
        );
      });

    message.success(
      'SDK Player 事件监听绑定成功 可以打开控制台 查看事件日志 [sdk player event:]'
    );
  };

  const setGlobalParams = () => {
    if (!interativeRef.value) {
      return message.warning('请初始化sdk');
    }
    const values = cloneDeep(avatarConfigForm) as any;

    interativeRef.value.setGlobalParams({
      ...values
    });
    message.success('全局 start 信息 设置成功 服务信息设置成功 ');
  };

  const startAvatar = async () => {
    if (!interativeRef.value) {
      return message.warning('请初始化sdk');
    }

    loading.value = true;
    await interativeRef.value
      ?.start({
        wrapper: containerEl.value
      })
      .then(() => {
        console.warn('player fetch stream ed');
        message.success('连接成功 & 拉流订阅成功 & 流播放成功');
      })
      .catch((e: any) => {
        message.error('连接失败，可以打开控制台查看信息');
        console.error(e.code, e.message, e.name, e.stack);
      })
      .finally(() => {
        loading.value = false;
      });
  };

  const driveAction = async (actionId: string) => {
    if (!interativeRef.value) {
      return message.warning('请初始化sdk & 连接');
    }
    if (!actionId?.trim()) {
      return message.warning('请输入actionId');
    }
    interativeRef.value.writeCmd('action', actionId?.trim());
  };

  const writeText = async (text: string) => {
    const { tts, ...extend } = textDriverForm as any;
    if (!interativeRef.value) {
      return message.warning('请初始化sdk & 连接');
    }
    if (!text?.trim()) {
      return message.warning('请输入文本');
    }
    if (tts && !tts?.vcn) {
      delete (tts as any).vcn;
    }
    interativeRef.value
      .writeText(text, {
        tts,
        ...extend
      })
      .then((reqId: string) => {
        message.success(`发送成功request_id: ${reqId}`);
      })
      .catch((err: any) => {
        console.error(err);
        message.error('发送失败，可以打开控制台查看信息');
      });
  };

  //中断
  const interrupt = async () => {
    if (!interativeRef.value) {
      return message.warning('请初始化sdk & 连接');
    }
    interativeRef.value.interrupt();
  };

  //停止
  const stopAvatar = async () => {
    if (!interativeRef.value) {
      return message.warning('请初始化sdk');
    }
    interativeRef.value?.stop();
  };

  onBeforeUnmount(() => {
    interativeRef.value?.stop();
    interativeRef.value?.destroy();
  });

  return {
    loading,
    avatarConfigForm,
    textDriverForm,
    containerEl,
    UnInitSDK,
    getPlayer,
    bindPlayerEvent,
    setGlobalParams,
    startAvatar,
    driveAction,
    writeText,
    interrupt,
    stopAvatar
  };
}
