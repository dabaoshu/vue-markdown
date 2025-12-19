<template>
  <div
    class="file-uploader"
    :class="{ 'is-dragover': isDragover }"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
    @click="triggerFileInput"
  >
    <input
      ref="fileInput"
      type="file"
      class="file-input"
      :accept="accept"
      @change="handleFileChange"
    />
    <div class="upload-content">
      <div class="upload-icon">
        <svg viewBox="0 0 24 24" width="48" height="48">
          <path
            fill="currentColor"
            d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"
          />
        </svg>
      </div>
      <div class="upload-text">
        <p class="primary-text">拖拽文件到这里或点击上传</p>
        <p class="secondary-text">支持 {{ accept }} 格式</p>
      </div>
    </div>
    <div v-if="uploading" class="upload-progress">
      <div class="progress-bar">
        <div
          class="progress-bar-inner"
          :style="{ width: `${uploadProgress}%` }"
        ></div>
      </div>
      <span class="progress-text">{{ uploadProgress }}%</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';

  interface Props {
    accept?: string;
    maxSize?: number; // 单位：MB
    onUpload?: (file: File) => Promise<void>;
  }

  const props = withDefaults(defineProps<Props>(), {
    accept: '*/*',
    maxSize: 10,
    onUpload: undefined
  });

  const emit = defineEmits<{
    (e: 'upload-success', file: File): void;
    (e: 'upload-error', error: Error): void;
  }>();

  const fileInput = ref<HTMLInputElement | null>(null);
  const isDragover = ref(false);
  const uploading = ref(false);
  const uploadProgress = ref(0);

  const triggerFileInput = () => {
    fileInput.value?.click();
  };

  const handleDragOver = (e: DragEvent) => {
    isDragover.value = true;
  };

  const handleDragLeave = (e: DragEvent) => {
    isDragover.value = false;
  };

  const validateFile = (file: File): boolean => {
    if (props.maxSize && file.size > props.maxSize * 1024 * 1024) {
      emit('upload-error', new Error(`文件大小不能超过 ${props.maxSize}MB`));
      return false;
    }
    return true;
  };

  const handleFile = async (file: File) => {
    if (!validateFile(file)) return;

    try {
      uploading.value = true;
      uploadProgress.value = 0;

      if (props.onUpload) {
        await props.onUpload(file);
      }

      // 模拟上传进度
      const interval = setInterval(() => {
        if (uploadProgress.value < 90) {
          uploadProgress.value += 10;
        }
      }, 200);

      // 模拟上传完成
      setTimeout(() => {
        clearInterval(interval);
        uploadProgress.value = 100;
        emit('upload-success', file);
        uploading.value = false;
      }, 2000);
    } catch (error) {
      emit('upload-error', error as Error);
      uploading.value = false;
    }
  };

  const handleDrop = (e: DragEvent) => {
    isDragover.value = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: Event) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };
</script>

<style scoped>
  .file-uploader {
    position: relative;
    width: 100%;
    height: 200px;
    border: 2px dashed #ccc;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: #fafafa;
  }

  .file-uploader:hover {
    border-color: #409eff;
    background-color: #f0f9ff;
  }

  .file-uploader.is-dragover {
    border-color: #409eff;
    background-color: #ecf5ff;
  }

  .file-input {
    display: none;
  }

  .upload-content {
    text-align: center;
  }

  .upload-icon {
    color: #909399;
    margin-bottom: 16px;
  }

  .primary-text {
    font-size: 16px;
    color: #303133;
    margin: 0 0 8px;
  }

  .secondary-text {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }

  .upload-progress {
    position: absolute;
    bottom: 20px;
    left: 20px;
    right: 20px;
  }

  .progress-bar {
    height: 4px;
    background-color: #e4e7ed;
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-bar-inner {
    height: 100%;
    background-color: #409eff;
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    display: block;
    text-align: center;
  }
</style>
