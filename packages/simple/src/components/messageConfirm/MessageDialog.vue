<template>
  <div class="mask">
    <ElConfigProvider :locale="zhCn">
      <transition name="fade">
        <div v-show="isShow" class="dialog" :class="modalClass" :style="style">
          <slot name="header" :cancel="cancel">
            <div class="dialog-header">
              <div class="flex flex-c">
                <MyIcon
                  v-show="showIcon"
                  :type="icon"
                  style="font-size: 22px; color: red"
                  class="mr-16"
                ></MyIcon>
                <div>{{ title }}</div>
              </div>
              <MyIcon
                type="icon-guanbi"
                class="close"
                style="font-size: 14px"
                @click="cancel"
              ></MyIcon>
            </div>
          </slot>
          <div class="dialog-body">
            <!-- 插槽出口 ref：用于读取自定义子组件的 submit() -->
            <slot name="default" ref="childRef">
              <div class="width100">
                <!-- 仅可信内容使用 HTML；外部数据请改为纯文本 -->
                <div class="content" v-html="content"></div>
                <div class="tips">{{ tips }}</div>
              </div>
            </slot>
          </div>
          <div class="dialog-footer">
            <slot name="footer" :confirm="confirm" :cancel="cancel">
              <ElButton v-if="showCancel" class="cancel" @click="cancel">{{
                cancelBtnTxt
              }}</ElButton>
              <ElButton
                v-if="showConfirm"
                :loading="loading"
                type="primary"
                :class="{ danger: type === 'danger' }"
                @click="confirm"
              >
                {{ confirmBtnTxt }}
              </ElButton>
            </slot>
          </div>
        </div>
      </transition>
    </ElConfigProvider>
  </div>
</template>

<script setup lang="ts">
  import MyIcon from '@/components/myIcon';
  import { computed, CSSProperties, onMounted, ref } from 'vue';
  import { ElButton, ElConfigProvider } from 'element-plus';
  import zhCn from 'element-plus/dist/locale/zh-cn.mjs';

  /**
   * 程序化确认弹窗内容：支持 `content` 文案，或在 default 插槽中挂载带 `submit()` 的子组件。
   */
  const {
    type,
    title,
    content,
    tips,
    confirmBtnTxt,
    cancelBtnTxt,
    showConfirm,
    showCancel,
    onConfirm,
    onCancel,
    icon,
    width,
    height,
    showIcon,
    modalClass
  } = withDefaults(
    defineProps<{
      width?: CSSProperties['width'];
      height?: CSSProperties['height'];
      type?: string;
      title?: string;
      content?: string;
      tips?: string;
      confirmBtnTxt?: string;
      cancelBtnTxt?: string;
      modalClass?: string;
      showConfirm?: boolean;
      showCancel?: boolean;
      showIcon?: boolean;
      /** 确定：无子表单时无参数；有 submit() 时为 submit 返回值 */
      onConfirm?: (values?: unknown) => void | Promise<void>;
      onCancel?: () => void | Promise<void>;
      icon?: string;
    }>(),
    {
      type: 'warning',
      title: '提示',
      content: '',
      tips: '',
      confirmBtnTxt: '确定',
      cancelBtnTxt: '取消',
      showCancel: true,
      showConfirm: true,
      showIcon: true,
      onConfirm: () => {},
      onCancel: () => {},
      modalClass: '',
      icon: 'icon-v2c-zhuyi'
    }
  );

  const style = computed(() => ({
    width,
    height
  }));

  defineSlots<{
    default?: () => unknown;
    footer?: () => unknown;
    header?: () => unknown;
  }>();

  const isShow = ref(false);

  /** 指向 default 插槽根组件/元素（Vue 在插槽出口上的 ref） */
  const childRef = ref<unknown>(null);

  const loading = ref(false);

  /**
   * 从插槽 ref 解析可调用 submit() 的实例（多根插槽时取第一个）。
   */
  function getSubmitTarget(): { submit?: () => unknown } | null {
    const r = childRef.value;
    if (r == null) return null;
    const node = Array.isArray(r) ? r[0] : r;
    return (node ?? null) as { submit?: () => unknown } | null;
  }

  /**
   * 点击确定：若有子组件 `submit()` 则先校验/取值，再触发 `onConfirm`。
   */
  async function confirm() {
    const target = getSubmitTarget();
    const hasSubmit =
      target &&
      typeof target === 'object' &&
      typeof target.submit === 'function';

    loading.value = true;
    try {
      if (hasSubmit) {
        const values = await Promise.resolve(target.submit!());
        await Promise.resolve(onConfirm(values));
      } else {
        await Promise.resolve(onConfirm());
      }
    } finally {
      loading.value = false;
    }
  }

  /**
   * 点击取消或关闭：触发 `onCancel`。
   */
  function cancel() {
    void Promise.resolve(onCancel());
  }

  onMounted(() => {
    isShow.value = true;
  });
</script>

<style scoped lang="scss">
  /* 定义进入和离开动画的过渡效果 */
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 1s;
    transform: translateY(0px);
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
    transform: translateY(-20px);
  }

  .mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;

    .dialog {
      box-shadow: 0px 12px 32px 4px rgba(0, 0, 0, 0.04),
        0px 8px 20px rgba(0, 0, 0, 0.08);
      background: #fff;
      // padding: 32px;
      position: relative;
      width: 480px;
      border-radius: 8px;
      transition: 0.4s;
      padding: 32px;
    }
    .dialog-header {
      padding-bottom: 18px;
      color: #000;
      font-size: 16px;
      font-weight: 600;
      line-height: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .close {
        cursor: pointer;
      }
    }
    .dialog-body {
      padding: 0 3px;
      // text-align: center;
      color: rgba(51, 51, 51, 0.6);
      font-size: 16px;
      // font-weight: 600;
      min-height: 74px;
      // display: flex;
      // align-items: center;
      // justify-content: center;

      .tips {
        font-size: 14px;
        color: #666;
        font-weight: 400;
      }
    }
    .dialog-footer {
      padding-top: 12px;
      text-align: right;

      // .btn {
      //   padding: 0px 16px;
      //   height: 40px;
      //   margin-left: 15px;
      //   border: 1px solid rgba(217, 217, 217, 1);
      //   border-radius: 8px;
      //   background: #fff;
      // }

      // .cancel {
      //   &:hover {
      //     color: #426eff;
      //     background-color: #ecf1ff;
      //     border-color: #c6d4ff;
      //   }
      // }

      // .confirm {
      //   background: #426eff;
      //   border: none;
      //   color: #fff;
      //   &:hover {
      //     color: #fff;
      //     background-color: #7b9aff;
      //   }
      // }

      .danger {
        background: #f56c6c;

        &:hover {
          color: #fff;
          background-color: #f89898;
        }
      }
    }
  }
</style>
