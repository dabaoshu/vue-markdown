<script lang="ts" setup>
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { TICKET_ID } from './constants';
import type { ChatTurn, SceneShell } from './types';

/**
 * 业务场景薄壳：按 `shell` 分发助手对话 / 知识库文章 / 工单详情。
 * 对话发送逻辑在 SceneReader，本文件只负责布局与复制单号。
 */
const props = defineProps<{
  /** 壳类型 */
  shell: SceneShell;
  /** article 标题，通常为 scene.label */
  label?: string;
  /** assistant 消息列表 */
  turns?: ChatTurn[];
  /** 底部输入草稿 */
  draft?: string;
  /** 正在等待预制回复 */
  sending?: boolean;
  /** 已达追问上限 */
  ended?: boolean;
}>();

const emit = defineEmits<{
  /** 同步输入框 */
  'update:draft': [value: string];
  /** 点击发送（或 Enter） */
  send: [];
}>();

/**
 * 收成可渲染的壳分支；新增 SceneShell 成员时 default 的 never 会编译失败。
 *
 * @param shell 当前场景壳
 */
function resolveShell(shell: SceneShell): SceneShell {
  switch (shell) {
    case 'assistant':
    case 'article':
    case 'ticket':
      return shell;
    default: {
      const _exhaustive: never = shell;
      return _exhaustive;
    }
  }
}

const resolvedShell = computed(() => resolveShell(props.shell));

const messages = computed(() => props.turns ?? []);

const composerDisabled = computed(
  () => props.ended === true || props.sending === true
);

/**
 * 复制工单号到剪贴板。
 */
async function copyTicketId(): Promise<void> {
  try {
    await navigator.clipboard.writeText(TICKET_ID);
    ElMessage.success('已复制工单号');
  } catch (error) {
    console.error('[scenes] 复制工单号失败', error);
    ElMessage.warning('复制失败');
  }
}

/**
 * 把 textarea 输入同步给父级。
 *
 * @param event 原生 input 事件
 */
function onDraftInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }
  emit('update:draft', target.value);
}

/**
 * Enter 发送，Shift+Enter 换行。
 *
 * @param event 键盘事件
 */
function onComposerKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || event.shiftKey) {
    return;
  }
  event.preventDefault();
  if (composerDisabled.value) {
    return;
  }
  emit('send');
}
</script>

<template>
  <div
    v-if="resolvedShell === 'assistant'"
    class="scene-shell scene-shell--assistant"
  >
    <div class="scene-shell__messages" role="log" aria-live="polite">
      <div
        v-for="turn in messages"
        :key="turn.id"
        class="scene-shell__bubble"
        :class="
          turn.role === 'user'
            ? 'scene-shell__bubble--user'
            : 'scene-shell__bubble--assistant'
        "
      >
        <p v-if="turn.role === 'user'" class="scene-shell__user-text">
          {{ turn.text }}
        </p>
        <slot v-else name="assistant" :turn="turn" />
      </div>
    </div>
    <p v-if="ended" class="scene-shell__ended">
      演示对话已结束，切换场景可重来
    </p>
    <div class="scene-shell__composer">
      <textarea
        class="scene-shell__textarea"
        :value="draft"
        :disabled="composerDisabled"
        rows="3"
        placeholder="再问一句…"
        @input="onDraftInput"
        @keydown="onComposerKeydown"
      />
      <button
        class="scene-shell__send"
        type="button"
        :disabled="composerDisabled"
        @click="emit('send')"
      >
        发送
      </button>
    </div>
  </div>

  <article
    v-else-if="resolvedShell === 'article'"
    class="scene-shell scene-shell--article"
  >
    <span class="scene-shell__tag">知识库</span>
    <h1 class="scene-shell__title">{{ label }}</h1>
    <div class="scene-shell__body">
      <slot />
    </div>
  </article>

  <section
    v-else-if="resolvedShell === 'ticket'"
    class="scene-shell scene-shell--ticket"
  >
    <header class="scene-shell__ticket-bar">
      <span class="scene-shell__ticket-id">{{ TICKET_ID }}</span>
      <button
        class="scene-shell__copy"
        type="button"
        @click="copyTicketId"
      >
        复制单号
      </button>
    </header>
    <div class="scene-shell__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.scene-shell {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.scene-shell--assistant {
  display: flex;
  flex-direction: column;
  min-height: 480px;
}

.scene-shell__messages {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  overflow: auto;
}

.scene-shell__bubble {
  max-width: 100%;
}

.scene-shell__bubble--user {
  align-self: flex-end;
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 10px;
  color: #fff;
  background: #2563eb;
}

.scene-shell__bubble--assistant {
  align-self: stretch;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}

.scene-shell__user-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.scene-shell__ended {
  margin: 0 16px 8px;
  color: #64748b;
  font-size: 13px;
}

.scene-shell__composer {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 12px 16px 16px;
  border-top: 1px solid #e2e8f0;
}

.scene-shell__textarea {
  flex: 1;
  min-height: 72px;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #0f172a;
  background: #fff;
  font: inherit;
  line-height: 1.5;
  resize: vertical;
}

.scene-shell__textarea:focus {
  outline: 2px solid #bfdbfe;
  border-color: #2563eb;
}

.scene-shell__textarea:disabled {
  color: #94a3b8;
  background: #f8fafc;
  cursor: not-allowed;
}

.scene-shell__send,
.scene-shell__copy {
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.scene-shell__send {
  flex: none;
  border: none;
  color: #fff;
  background: #2563eb;
}

.scene-shell__send:hover:not(:disabled) {
  background: #1d4ed8;
}

.scene-shell__send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.scene-shell--article,
.scene-shell--ticket {
  padding: 24px;
}

.scene-shell__tag {
  display: inline-block;
  margin-bottom: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  color: #64748b;
  background: #f1f5f9;
  font-size: 11px;
  font-weight: 600;
}

.scene-shell__title {
  margin: 0 0 16px;
  color: #0f172a;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.4;
}

.scene-shell__ticket-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.scene-shell__ticket-id {
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
  font-family: Consolas, Monaco, 'Courier New', monospace;
}

.scene-shell__copy {
  border: 1px solid #e2e8f0;
  color: #2563eb;
  background: #fff;
}

.scene-shell__copy:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.scene-shell__body {
  min-width: 0;
}
</style>
