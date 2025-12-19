<template>
  <div
    class="video-uploader"
    :class="{ 'is-dragover': isDragover, 'has-video': videoFile }"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
    @click="triggerFileInput"
  >
    <input
      ref="fileInput"
      type="file"
      class="file-input"
      accept="video/mp4,video/quicktime,.mp4,.mov"
      @change="handleFileChange"
    />
    <div v-if="!videoFile" class="upload-content">
      <div class="upload-icon">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
          <path
            d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"
          />
        </svg>
      </div>
      <div class="upload-text">
        <p class="primary-text">{{ uploadText }}</p>
        <p class="secondary-text">{{ requirements }}</p>
        <p v-if="showTutorial" class="tutorial-link" @click.stop="handleTutorialClick">
          查看教程
        </p>
      </div>
    </div>
    <div v-else class="video-preview">
      <video
        ref="videoPreview"
        :src="videoUrl"
        class="preview-video"
        controls
        @loadedmetadata="handleVideoLoaded"
      ></video>
      <div class="video-info">
        <p class="video-name">{{ videoFile.name }}</p>
        <p class="video-size">{{ formatFileSize(videoFile.size) }}</p>
      </div>
      <div class="video-actions">
        <button class="btn-remove" @click.stop="handleRemove">删除</button>
        <button class="btn-replace" @click.stop="triggerFileInput">重新上传</button>
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
    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue';
  import { ElMessage } from 'element-plus';

  interface Props {
    /** 上传提示文本 */
    uploadText?: string;
    /** 视频要求说明 */
    requirements?: string;
    /** 是否显示教程链接 */
    showTutorial?: boolean;
    /** 是否需要Alpha通道（去背景模式） */
    requireAlpha?: boolean;
  }

  const props = withDefaults(defineProps<Props>(), {
    uploadText: '请上传一段视频用于生成数字人',
    requirements: '竖版 9:16 视频(1080P/25FPS),时长30秒-2分钟,大小≤300M,格式 MOV/MP4',
    showTutorial: true,
    requireAlpha: false
  });

  const emit = defineEmits<{
    (e: 'upload-success', file: File, videoInfo: VideoInfo): void;
    (e: 'upload-error', error: Error): void;
    (e: 'remove'): void;
  }>();

  interface VideoInfo {
    width: number;
    height: number;
    duration: number;
    aspectRatio: number;
  }

  const fileInput = ref<HTMLInputElement | null>(null);
  const videoPreview = ref<HTMLVideoElement | null>(null);
  const isDragover = ref(false);
  const uploading = ref(false);
  const uploadProgress = ref(0);
  const videoFile = ref<File | null>(null);
  const videoUrl = ref<string>('');
  const errorMessage = ref<string>('');
  const videoInfo = ref<VideoInfo | null>(null);

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * 验证视频文件
   */
  const validateVideo = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    // 验证文件格式
    const validTypes = ['video/mp4', 'video/quicktime'];
    const validExtensions = ['.mp4', '.mov'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      return { valid: false, error: '视频格式不正确，仅支持 MOV/MP4 格式' };
    }

    // 验证文件大小（≤300M）
    const maxSize = 300 * 1024 * 1024; // 300MB
    if (file.size > maxSize) {
      return { valid: false, error: '文件大小不能超过 300MB' };
    }

    // 创建视频元素来获取视频信息
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const duration = video.duration;
        const aspectRatio = width / height;

        // 验证分辨率（1080P = 1920x1080，但竖版是 1080x1920）
        const isVertical = height > width;
        const is1080P = isVertical
          ? (width === 1080 && height === 1920) || (width === 1080 && height >= 1920)
          : (width === 1920 && height === 1080);

        if (!is1080P) {
          URL.revokeObjectURL(url);
          resolve({
            valid: false,
            error: `视频分辨率不符合要求，需要竖版 9:16 视频(1080P)，当前为 ${width}x${height}`
          });
          return;
        }

        // 验证宽高比（竖版 9:16）
        const targetRatio = 9 / 16;
        const ratioTolerance = 0.1; // 允许10%的误差
        if (isVertical && Math.abs(aspectRatio - targetRatio) > ratioTolerance) {
          URL.revokeObjectURL(url);
          resolve({
            valid: false,
            error: `视频宽高比不符合要求，需要竖版 9:16，当前为 ${width}:${height}`
          });
          return;
        }

        // 验证时长（30秒-2分钟）
        if (duration < 30 || duration > 120) {
          URL.revokeObjectURL(url);
          resolve({
            valid: false,
            error: `视频时长不符合要求，需要30秒-2分钟，当前为 ${Math.round(duration)}秒`
          });
          return;
        }

        // 验证Alpha通道（如果需要）
        if (props.requireAlpha) {
          // 注意：浏览器无法直接检测Alpha通道，这里只是提示
          // 实际验证需要在后端进行
        }

        videoInfo.value = {
          width,
          height,
          duration,
          aspectRatio
        };

        URL.revokeObjectURL(url);
        resolve({ valid: true });
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ valid: false, error: '无法读取视频文件，请检查文件是否损坏' });
      };
    });
  };

  /**
   * 处理文件上传
   */
  const handleFile = async (file: File) => {
    errorMessage.value = '';
    
    // 验证文件
    const validation = await validateVideo(file);
    if (!validation.valid) {
      errorMessage.value = validation.error || '文件验证失败';
      emit('upload-error', new Error(validation.error || '文件验证失败'));
      return;
    }

    videoFile.value = file;
    videoUrl.value = URL.createObjectURL(file);

    try {
      uploading.value = true;
      uploadProgress.value = 0;

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
        uploading.value = false;
        
        if (videoInfo.value) {
          emit('upload-success', file, videoInfo.value);
        }
      }, 2000);
    } catch (error) {
      emit('upload-error', error as Error);
      uploading.value = false;
      errorMessage.value = '上传失败，请重试';
    }
  };

  /**
   * 触发文件选择
   */
  const triggerFileInput = () => {
    fileInput.value?.click();
  };

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = (e: DragEvent) => {
    isDragover.value = true;
  };

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = (e: DragEvent) => {
    isDragover.value = false;
  };

  /**
   * 处理文件拖放
   */
  const handleDrop = (e: DragEvent) => {
    isDragover.value = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  /**
   * 处理文件选择
   */
  const handleFileChange = (e: Event) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  /**
   * 处理视频加载完成
   */
  const handleVideoLoaded = () => {
    // 视频元数据已加载
  };

  /**
   * 处理删除
   */
  const handleRemove = () => {
    if (videoUrl.value) {
      URL.revokeObjectURL(videoUrl.value);
    }
    videoFile.value = null;
    videoUrl.value = '';
    videoInfo.value = null;
    errorMessage.value = '';
    if (fileInput.value) {
      fileInput.value.value = '';
    }
    emit('remove');
  };

  /**
   * 处理教程点击
   */
  const handleTutorialClick = () => {
    ElMessage.info('教程功能待实现');
  };

  /**
   * 暴露方法给父组件
   */
  defineExpose({
    getFile: () => videoFile.value,
    getVideoInfo: () => videoInfo.value,
    clear: handleRemove
  });
</script>

<style scoped>
  .video-uploader {
    position: relative;
    width: 100%;
    min-height: 200px;
    border: 2px dashed #d9d9d9;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: #fafafa;
    padding: 20px;
  }

  .video-uploader:hover {
    border-color: #409eff;
    background-color: #f0f9ff;
  }

  .video-uploader.is-dragover {
    border-color: #409eff;
    background-color: #ecf5ff;
  }

  .video-uploader.has-video {
    min-height: auto;
    padding: 16px;
  }

  .file-input {
    display: none;
  }

  .upload-content {
    text-align: center;
    width: 100%;
  }

  .upload-icon {
    color: #409eff;
    margin-bottom: 16px;
    display: flex;
    justify-content: center;
  }

  .primary-text {
    font-size: 14px;
    color: #303133;
    margin: 0 0 8px;
    font-weight: 500;
  }

  .secondary-text {
    font-size: 12px;
    color: #909399;
    margin: 0 0 8px;
    line-height: 1.5;
  }

  .tutorial-link {
    font-size: 12px;
    color: #409eff;
    cursor: pointer;
    margin: 0;
    text-decoration: underline;
  }

  .tutorial-link:hover {
    color: #66b1ff;
  }

  .video-preview {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .preview-video {
    max-width: 100%;
    max-height: 300px;
    border-radius: 4px;
    background: #000;
  }

  .video-info {
    text-align: center;
    width: 100%;
  }

  .video-name {
    font-size: 14px;
    color: #303133;
    margin: 0 0 4px;
    word-break: break-all;
  }

  .video-size {
    font-size: 12px;
    color: #909399;
    margin: 0;
  }

  .video-actions {
    display: flex;
    gap: 8px;
  }

  .btn-remove,
  .btn-replace {
    padding: 6px 16px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background: #fff;
    color: #606266;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-remove:hover {
    border-color: #f56c6c;
    color: #f56c6c;
  }

  .btn-replace:hover {
    border-color: #409eff;
    color: #409eff;
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

  .error-message {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 12px;
    color: #f56c6c;
    background: #fef0f0;
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
  }
</style>






