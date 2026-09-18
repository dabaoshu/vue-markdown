<script lang="ts" setup>
import { computed, provide, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { MarkdownRenderer } from '@nnnb/markdown-ui';
import AttachmentPreview from './AttachmentPreview.vue';
import IntakeForm from './IntakeForm.vue';
import SceneShells from './SceneShells.vue';
import { pickCannedReply } from './cannedReplies';
import { FOLLOW_UP_DELAY_MS } from './constants';
import { SCENE_PREVIEW_KEY, sceneHttpComponents } from './HttpResourceMark';
import { createEmptyIntakeForm } from './intakeValidation';
import { canSendFollowUp } from './resolveSceneId';
import { getScene } from './sceneData';
import type {
  AttachmentPreviewModel,
  ChatTurn,
  IntakeFormValue,
  SceneId
} from './types';

/**
 * 业务场景阅读器：按壳组合 Markdown、对话、报障表与附件预览。
 * 禁止接入 MarkdownWorkbench；追问延迟只用 setTimeout。
 */
const props = defineProps<{
  /** 当前场景 id，由页面层 resolveSceneId 后传入 */
  sceneId: SceneId;
}>();

const scene = computed(() => getScene(props.sceneId));

const turns = ref<ChatTurn[]>([]);
const draft = ref('');
const sending = ref(false);
const intakeForm = ref<IntakeFormValue>(createEmptyIntakeForm());
const submitted = ref<IntakeFormValue | null>(null);
const preview = ref<AttachmentPreviewModel | null>(null);

/** 切场景时递增，丢弃进行中的 setTimeout 回复 */
let generation = 0;

const userTurnCount = computed(
  () => turns.value.filter((turn) => turn.role === 'user').length
);

const chatEnded = computed(() => !canSendFollowUp(userTurnCount.value));

/**
 * HTTP 卡片点击打开预览。
 *
 * @param model 灯箱或文件抽屉模型
 */
function openPreview(model: AttachmentPreviewModel): void {
  preview.value = model;
}

provide(SCENE_PREVIEW_KEY, openPreview);

/**
 * 关闭灯箱 / 抽屉。
 */
function closePreview(): void {
  preview.value = null;
}

/**
 * 固定时长等待；不用工作台流式控制器。
 *
 * @param ms 毫秒
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

watch(
  () => props.sceneId,
  (sceneId) => {
    generation += 1;
    const next = getScene(sceneId);
    turns.value = [
      { id: 'seed', role: 'assistant', text: next.markdown }
    ];
    draft.value = '';
    sending.value = false;
    intakeForm.value = createEmptyIntakeForm();
    submitted.value = null;
    preview.value = null;
  },
  { immediate: true }
);

/**
 * 发送一条用户追问，延迟后再追加预制助手回复。
 */
async function sendFollowUp(): Promise<void> {
  const text = draft.value.trim();
  if (!text) {
    return;
  }
  if (!canSendFollowUp(userTurnCount.value)) {
    return;
  }
  if (sending.value) {
    return;
  }

  const session = generation;
  turns.value.push({
    id: `user-${userTurnCount.value + 1}`,
    role: 'user',
    text
  });
  draft.value = '';
  sending.value = true;

  try {
    await sleep(FOLLOW_UP_DELAY_MS);
    if (session !== generation) {
      return;
    }
    turns.value.push({
      id: `assistant-${userTurnCount.value}`,
      role: 'assistant',
      text: pickCannedReply(props.sceneId, text)
    });
  } catch (error) {
    console.error('[scenes] 追问回复失败', error);
  } finally {
    if (session === generation) {
      sending.value = false;
    }
  }
}

/**
 * 报障表校验已通过：提示成功并展示结果卡。
 *
 * @param value 提交时的表单快照
 */
function onIntakeSubmit(value: IntakeFormValue): void {
  submitted.value = { ...value };
  ElMessage.success('提交成功');
}

/**
 * 清空结果卡，重新填一张空表。
 */
function resetIntake(): void {
  submitted.value = null;
  intakeForm.value = createEmptyIntakeForm();
}
</script>

<template>
  <div class="scene-reader">
    <SceneShells
      :shell="scene.shell"
      :label="scene.label"
      :turns="turns"
      :draft="draft"
      :sending="sending"
      :ended="chatEnded"
      @update:draft="draft = $event"
      @send="sendFollowUp"
    >
      <template #assistant="{ turn }">
        <MarkdownRenderer
          :source="turn.text"
          :features="scene.features"
          :components="sceneHttpComponents"
        />
      </template>

      <template v-if="scene.shell !== 'assistant'">
        <MarkdownRenderer
          :source="scene.markdown"
          :features="scene.features"
          :components="sceneHttpComponents"
        />
        <template v-if="scene.id === 'intake'">
          <IntakeForm
            v-if="!submitted"
            v-model="intakeForm"
            @submit="onIntakeSubmit"
          />
          <div v-else class="scene-reader__result">
            <h2 class="scene-reader__result-title">已提交</h2>
            <pre class="scene-reader__result-json">{{
              JSON.stringify(submitted, null, 2)
            }}</pre>
            <button
              class="scene-reader__reset"
              type="button"
              @click="resetIntake"
            >
              再填一张
            </button>
          </div>
        </template>
      </template>
    </SceneShells>

    <AttachmentPreview :model="preview" @close="closePreview" />
  </div>
</template>

<style scoped>
.scene-reader {
  min-width: 0;
}

.scene-reader__result {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}

.scene-reader__result-title {
  margin: 0 0 12px;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.scene-reader__result-json {
  margin: 0 0 16px;
  padding: 12px;
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #334155;
  background: #fff;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.scene-reader__reset {
  height: 36px;
  padding: 0 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #2563eb;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.scene-reader__reset:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}
</style>
