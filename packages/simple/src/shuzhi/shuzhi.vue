<template>
  <el-dialog
    v-model="dialogVisible"
    class="customize-digital-human-dialog"
    title="定制数字人"
    width="800px"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      label-position="left"
    >
      <!-- 数字人名称 -->
      <el-form-item label="数字人名称" prop="name" required>
        <div class="name-input-wrapper">
          <el-input
            v-model="formData.name"
            placeholder="给数智人起个名字"
            maxlength="50"
            show-word-limit
            clearable
          />
        </div>
      </el-form-item>

      <!-- 数字人性别 -->
      <el-form-item label="数字人性别" prop="gender" required>
        <el-radio-group v-model="formData.gender">
          <el-radio label="male">
            <span class="gender-label">男生</span>
            <span class="gender-icon">♂</span>
          </el-radio>
          <el-radio label="female">
            <span class="gender-label">女生</span>
            <span class="gender-icon">♀</span>
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 上传视频素材 -->
      <el-form-item label="上传视频素材" prop="videoMode" required>
        <el-tabs
          v-model="formData.videoMode"
          @tab-change="handleVideoModeChange"
        >
          <el-tab-pane label="自带原视频背景" name="withBackground">
            <div class="video-upload-container">
              <!-- 左侧：生成数字人的视频 -->
              <div class="upload-section">
                <div class="upload-section-title">生成数字人视频</div>
                <VideoUploader
                  ref="originalVideoRef"
                  upload-text="请上传一段视频用于生成数字人"
                  requirements="竖版 9:16 视频(1080P/25FPS),时长30秒-2分钟,大小≤300M,格式 MOV/MP4"
                  :show-tutorial="true"
                  @upload-success="handleOriginalVideoSuccess"
                  @upload-error="handleVideoError"
                  @remove="handleOriginalVideoRemove"
                />
              </div>

              <!-- 右侧：去背景后的视频 -->
              <div class="upload-section">
                <div class="upload-section-title">去背景视频</div>
                <VideoUploader
                  ref="backgroundRemovedVideoRef"
                  upload-text="将同个视频素材进行去背景处理后上传"
                  requirements="视频素材需包含 Alpha通道,其中背景部分为黑色、人物部分为白色"
                  :show-tutorial="true"
                  :require-alpha="true"
                  @upload-success="handleBackgroundRemovedVideoSuccess"
                  @upload-error="handleVideoError"
                  @remove="handleBackgroundRemovedVideoRemove"
                />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="去掉视频背景" name="removeBackground">
            <div class="video-upload-container single">
              <div class="upload-section">
                <VideoUploader
                  ref="singleVideoRef"
                  upload-text="请上传一段视频用于生成数字人"
                  requirements="竖版 9:16 视频(1080P/25FPS),时长30秒-2分钟,大小≤300M,格式 MOV/MP4"
                  :show-tutorial="true"
                  @upload-success="handleSingleVideoSuccess"
                  @upload-error="handleVideoError"
                  @remove="handleSingleVideoRemove"
                />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-form-item>

      <!-- 同意条款 -->
      <el-form-item prop="agreed">
        <el-checkbox v-model="formData.agreed">
          我确认我拥有上传文件的所有必要权利,保证不会用克隆形象创作违法内容。
        </el-checkbox>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue';
  import {
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElRadioGroup,
    ElRadio,
    ElTabs,
    ElTabPane,
    ElCheckbox,
    ElButton,
    ElMessage,
    type FormInstance,
    type FormRules
  } from 'element-plus';
  import VideoUploader from './VideoUploader.vue';

  interface Props {
    /** 控制模态框显示/隐藏 */
    modelValue: boolean;
    /** API提交地址（可选） */
    apiUrl?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    apiUrl: ''
  });

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'submit', data: FormData): void;
    (e: 'cancel'): void;
  }>();

  interface FormData {
    name: string;
    gender: 'male' | 'female' | '';
    videoMode: 'withBackground' | 'removeBackground';
    originalVideo: File | null;
    backgroundRemovedVideo: File | null;
    singleVideo: File | null;
    agreed: boolean;
  }

  const formRef = ref<FormInstance | null>(null);
  const originalVideoRef = ref<InstanceType<typeof VideoUploader> | null>(null);
  const backgroundRemovedVideoRef = ref<InstanceType<
    typeof VideoUploader
  > | null>(null);
  const singleVideoRef = ref<InstanceType<typeof VideoUploader> | null>(null);
  const submitting = ref(false);

  const formData = ref<FormData>({
    name: '',
    gender: '',
    videoMode: 'withBackground',
    originalVideo: null,
    backgroundRemovedVideo: null,
    singleVideo: null,
    agreed: false
  });

  /**
   * 自定义验证规则：视频上传
   */
  const validateVideo = (_rule: any, _value: any, callback: any) => {
    if (formData.value.videoMode === 'withBackground') {
      // 自带原视频背景模式：需要两个视频
      if (
        !formData.value.originalVideo ||
        !formData.value.backgroundRemovedVideo
      ) {
        callback(new Error('请上传生成数字人视频和去背景视频'));
        return;
      }
    } else {
      // 去掉视频背景模式：只需要一个视频
      if (!formData.value.singleVideo) {
        callback(new Error('请上传视频素材'));
        return;
      }
    }
    callback();
  };

  /**
   * 自定义验证规则：同意条款
   */
  const validateAgreed = (_rule: any, value: boolean, callback: any) => {
    if (!value) {
      callback(new Error('请确认您拥有上传文件的所有必要权利'));
      return;
    }
    callback();
  };

  /**
   * 表单验证规则
   */
  const formRules: FormRules = {
    name: [
      { required: true, message: '请输入数字人名称', trigger: 'blur' },
      { max: 50, message: '名称不能超过50个字符', trigger: 'blur' }
    ],
    gender: [
      { required: true, message: '请选择数字人性别', trigger: 'change' }
    ],
    videoMode: [{ validator: validateVideo, trigger: 'change' }],
    agreed: [{ validator: validateAgreed, trigger: 'change' }]
  };

  /**
   * 计算属性：对话框显示状态
   */
  const dialogVisible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => {
      emit('update:modelValue', value);
    }
  });

  /**
   * 处理视频模式切换
   */
  const handleVideoModeChange = (mode: string) => {
    // 切换模式时清空之前的视频
    if (mode === 'withBackground') {
      formData.value.singleVideo = null;
      singleVideoRef.value?.clear();
    } else {
      formData.value.originalVideo = null;
      formData.value.backgroundRemovedVideo = null;
      originalVideoRef.value?.clear();
      backgroundRemovedVideoRef.value?.clear();
    }
    // 触发表单验证
    formRef.value?.validateField('videoMode');
  };

  /**
   * 处理原始视频上传成功
   */
  const handleOriginalVideoSuccess = (file: File) => {
    formData.value.originalVideo = file;
    formRef.value?.validateField('videoMode');
  };

  /**
   * 处理原始视频删除
   */
  const handleOriginalVideoRemove = () => {
    formData.value.originalVideo = null;
    formRef.value?.validateField('videoMode');
  };

  /**
   * 处理去背景视频上传成功
   */
  const handleBackgroundRemovedVideoSuccess = (file: File) => {
    formData.value.backgroundRemovedVideo = file;
    formRef.value?.validateField('videoMode');
  };

  /**
   * 处理去背景视频删除
   */
  const handleBackgroundRemovedVideoRemove = () => {
    formData.value.backgroundRemovedVideo = null;
    formRef.value?.validateField('videoMode');
  };

  /**
   * 处理单个视频上传成功
   */
  const handleSingleVideoSuccess = (file: File) => {
    formData.value.singleVideo = file;
    formRef.value?.validateField('videoMode');
  };

  /**
   * 处理单个视频删除
   */
  const handleSingleVideoRemove = () => {
    formData.value.singleVideo = null;
    formRef.value?.validateField('videoMode');
  };

  /**
   * 处理视频上传错误
   */
  const handleVideoError = (error: Error) => {
    ElMessage.error(error.message || '视频上传失败');
  };

  /**
   * 处理提交
   */
  const handleSubmit = async () => {
    if (!formRef.value) return;

    try {
      // 验证表单
      await formRef.value.validate();

      submitting.value = true;

      // 准备提交数据
      const submitData: FormData = {
        ...formData.value
      };

      // 模拟API调用
      if (props.apiUrl) {
        // 如果有API地址，可以在这里调用
        // const formDataToSend = new FormData();
        // formDataToSend.append('name', submitData.name);
        // formDataToSend.append('gender', submitData.gender);
        // ... 其他字段
        // await fetch(props.apiUrl, { method: 'POST', body: formDataToSend });
      }

      // 模拟网络延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      ElMessage.success('提交成功');
      emit('submit', submitData as any);

      // 重置表单并关闭对话框
      resetForm();
      dialogVisible.value = false;
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      submitting.value = false;
    }
  };

  /**
   * 处理取消
   */
  const handleCancel = () => {
    resetForm();
    emit('cancel');
    dialogVisible.value = false;
  };

  /**
   * 处理关闭
   */
  const handleClose = () => {
    resetForm();
  };

  /**
   * 重置表单
   */
  const resetForm = () => {
    formRef.value?.resetFields();
    formData.value = {
      name: '',
      gender: '',
      videoMode: 'withBackground',
      originalVideo: null,
      backgroundRemovedVideo: null,
      singleVideo: null,
      agreed: false
    };
    originalVideoRef.value?.clear();
    backgroundRemovedVideoRef.value?.clear();
    singleVideoRef.value?.clear();
  };

  /**
   * 监听 modelValue 变化，重置表单
   */
  watch(
    () => props.modelValue,
    (newVal) => {
      if (!newVal) {
        resetForm();
      }
    }
  );
</script>

<style scoped>
  .customize-digital-human-dialog {
    :deep(.el-dialog__header) {
      padding: 20px 24px;
      border-bottom: 1px solid #e4e7ed;
    }

    :deep(.el-dialog__title) {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }

    :deep(.el-dialog__body) {
      padding: 24px;
    }

    :deep(.el-form-item__label) {
      font-weight: 500;
      color: #303133;
    }

    :deep(.el-form-item.is-required .el-form-item__label::before) {
      content: '*';
      color: #f56c6c;
      margin-right: 4px;
    }
  }

  .name-input-wrapper {
    width: 100%;
  }

  .gender-label {
    margin-right: 4px;
  }

  .gender-icon {
    font-size: 16px;
    color: #409eff;
  }

  .video-upload-container {
    display: flex;
    gap: 16px;
    margin-top: 16px;
  }

  .video-upload-container.single {
    justify-content: center;
  }

  .upload-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .upload-section-title {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 8px;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 12px 24px;
    border-top: 1px solid #e4e7ed;
  }

  :deep(.el-tabs__item) {
    font-size: 14px;
    padding: 0 20px;
  }

  :deep(.el-tabs__content) {
    padding-top: 16px;
  }

  :deep(.el-radio-group) {
    display: flex;
    gap: 24px;
  }

  :deep(.el-radio) {
    margin-right: 0;
  }

  :deep(.el-radio__label) {
    display: flex;
    align-items: center;
    gap: 4px;
  }
</style>
