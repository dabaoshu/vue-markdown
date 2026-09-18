<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { ElDialog, ElDrawer } from 'element-plus';
import type { AttachmentPreviewModel } from './types';

/**
 * 场景附件预览：图片走灯箱，文件走抽屉。
 * 失败图片不设置 img src；文件模式不 fetch、不 window.open 该 href。
 */
const props = defineProps<{
  /** 当前预览；null 表示关闭 */
  model: AttachmentPreviewModel | null;
}>();

const emit = defineEmits<{
  /** 关闭灯箱或抽屉；父级应把 model 置 null */
  close: [];
}>();

const imageModel = computed(() =>
  props.model?.mode === 'image' ? props.model : null
);

/**
 * 灯箱 img 在打开后再次失败（例如内联图 onError 前点了 404）。
 * 与 model.failed 一起决定切占位，避免死链留在 src。
 */
const lightboxImgBroken = ref(false);

watch(
  () => props.model,
  () => {
    lightboxImgBroken.value = false;
  }
);

const imageShowsFailed = computed(
  () => imageModel.value?.failed === true || lightboxImgBroken.value
);

/**
 * 灯箱图片加载失败：卸掉 img，改用失败占位。
 */
function onLightboxImageError(): void {
  lightboxImgBroken.value = true;
}

const fileModel = computed(() =>
  props.model?.mode === 'file' ? props.model : null
);

const imageVisible = computed({
  get: () => imageModel.value != null,
  set: (visible: boolean) => {
    if (!visible) {
      emit('close');
    }
  }
});

const fileVisible = computed({
  get: () => fileModel.value != null,
  set: (visible: boolean) => {
    if (!visible) {
      emit('close');
    }
  }
});

/**
 * 预览标题：图片用 alt，文件用 title。
 *
 * @param model 已打开的预览模型。
 */
function previewTitle(model: AttachmentPreviewModel): string {
  switch (model.mode) {
    case 'image':
      return model.alt || '图片预览';
    case 'file':
      return model.title || '附件预览';
    default: {
      const _exhaustive: never = model;
      return _exhaustive;
    }
  }
}

/**
 * 文件抽屉展示 kind/ext。
 *
 * @param model 文件预览模型。
 */
function fileKindLabel(model: Extract<AttachmentPreviewModel, { mode: 'file' }>): string {
  return model.ext ? `${model.kind}/${model.ext}` : model.kind;
}
</script>

<template>
  <ElDialog
    v-model="imageVisible"
    :title="imageModel ? previewTitle(imageModel) : '图片预览'"
    append-to-body
    destroy-on-close
    width="640px"
    class="attachment-preview-dialog"
  >
    <div
      v-if="imageShowsFailed && imageModel"
      class="attachment-preview__fail"
      role="img"
      :aria-label="`${imageModel.alt || '图片'}（加载失败）`"
    >
      加载失败
    </div>
    <img
      v-else-if="imageModel"
      class="attachment-preview__img"
      :src="imageModel.src"
      :alt="imageModel.alt"
      @error="onLightboxImageError"
    />
  </ElDialog>

  <ElDrawer
    v-model="fileVisible"
    :title="fileModel ? previewTitle(fileModel) : '附件预览'"
    append-to-body
    destroy-on-close
    direction="rtl"
    size="360px"
    class="attachment-preview-drawer"
  >
    <template v-if="fileModel">
      <p class="attachment-preview__title">{{ fileModel.title }}</p>
      <p class="attachment-preview__meta">{{ fileKindLabel(fileModel) }}</p>
      <!-- 演示环境故意不请求、不打开 href -->
      <p class="attachment-preview__hint">演示环境不拉取该文件</p>
    </template>
  </ElDrawer>
</template>

<style scoped>
.attachment-preview__img {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  margin: 0 auto;
  object-fit: contain;
  border-radius: 8px;
}

.attachment-preview__fail {
  display: flex;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  border: 2px dashed #b91c1c;
  border-radius: 8px;
  color: #b91c1c;
  background: #fef2f2;
  font-size: 14px;
}

.attachment-preview__title {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
}

.attachment-preview__meta {
  display: inline-block;
  margin: 0 0 16px;
  padding: 0 8px;
  border-radius: 999px;
  color: #1d4ed8;
  background: #dbeafe;
  font-size: 12px;
  line-height: 1.8;
}

.attachment-preview__hint {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}
</style>
