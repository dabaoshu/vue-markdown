<template>
  <div class="modalpage">
    <h2 class="modalpage__title">MessageModal 示例（createMessageModal）</h2>
    <p class="modalpage__desc">
      对应设计稿三类弹窗：信息确认恢复、警示删除、成功仅单按钮关闭。
    </p>

    <div class="modalpage__actions">
      <button
        type="button"
        class="modalpage__btn modalpage__btn--outline"
        @click="openRestoreModal"
      >
        确认恢复此版本（信息）
      </button>
      <button
        type="button"
        class="modalpage__btn modalpage__btn--outline"
        @click="openDeleteModal"
      >
        确认删除（警示）
      </button>
      <button
        type="button"
        class="modalpage__btn modalpage__btn--outline"
        @click="openPublishSuccessModal"
      >
        发布成功（成功）
      </button>
    </div>

    <p v-if="lastTip" class="modalpage__tip">{{ lastTip }}</p>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import {
    createMessageModal,
    isMessageModalCancelled
  } from '@/components/messageConfirm';

  /** 最近一次交互提示（演示 resolve / reject 结果） */
  const lastTip = ref('');

  /**
   * 弹窗 1：恢复草稿 — 蓝色信息图标 + 取消 / 确定
   */
  async function openRestoreModal() {
    lastTip.value = '';
    try {
      await createMessageModal({
        tone: 'info',
        title: '确认恢复此版本',
        content: '恢复将覆盖当前草稿状态，是否确认继续？',
        confirmBtnTxt: '确定',
        cancelBtnTxt: '取消',
        onConfirm: async () => {
          /* 演示：可在此处调用接口 */
        }
      });
      lastTip.value = '已确认恢复（Promise resolved）';
    } catch (e) {
      lastTip.value = isMessageModalCancelled(e)
        ? '已取消恢复（用户关闭）'
        : '操作失败';
    }
  }

  /**
   * 弹窗 2：删除 — 黄色警示图标 + 取消 / 确定
   */
  async function openDeleteModal() {
    lastTip.value = '';
    try {
      await createMessageModal({
        tone: 'warning',
        title: '确认删除',
        content: '删除后不可恢复，确认删除？',
        confirmBtnTxt: '确定',
        cancelBtnTxt: '取消',
        onConfirm: async () => {}
      });
      lastTip.value = '已确认删除（Promise resolved）';
    } catch (e) {
      lastTip.value = isMessageModalCancelled(e)
        ? '已取消删除（用户关闭）'
        : '操作失败';
    }
  }

  /**
   * 弹窗 3：发布成功 — 绿色勾 + 仅「我知道了」
   */
  async function openPublishSuccessModal() {
    lastTip.value = '';
    try {
      await createMessageModal({
        tone: 'success',
        title: '发布成功',
        content: '当前版本已成功发布',
        showCancel: false,
        confirmBtnTxt: '我知道了',
        onConfirm: async () => {}
      });
      lastTip.value = '已关闭成功提示（Promise resolved）';
    } catch (e) {
      lastTip.value = isMessageModalCancelled(e)
        ? '已关闭（用户取消）'
        : '操作失败';
    }
  }
</script>

<style scoped lang="scss">
  .modalpage {
    padding: 8px 0 32px;
  }

  .modalpage__title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 600;
    color: #0f172a;
  }

  .modalpage__desc {
    margin: 0 0 20px;
    font-size: 14px;
    line-height: 1.6;
    color: #64748b;
  }

  .modalpage__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .modalpage__btn {
    height: 40px;
    padding: 0 18px;
    border-radius: 10px;
    font-size: 14px;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }

  .modalpage__btn--outline {
    border: 1px solid #cbd5e1;
    background: #fff;
    color: #334155;

    &:hover {
      border-color: #94a3b8;
      background: #f8fafc;
    }
  }

  .modalpage__tip {
    margin-top: 20px;
    font-size: 13px;
    color: #1677ff;
  }
</style>
