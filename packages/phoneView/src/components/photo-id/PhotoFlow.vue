<template>
  <div class="photo-flow">
    <!-- 步骤导航 -->


</template>

<script lang="ts" setup>
import { ref } from 'vue';

interface SizeOption {
  id: string;
  label: string;
  width: number;
  height: number;
}

interface BgOption {
  id: string;
  label: string;
  color: string;
}

const stepNames = [
  '调整尺寸',
  '选择背景',
  '预览列表',
  '确认导出',
  '导出完成'
];
const currentStep = ref(1);

const sizeOptions: SizeOption[] = [
  { id: '1寸', label: '一寸', width: 25, height: 35 },
  { id: '2寸', label: '二寸', width: 35, height: 49 },
  { id: '小2寸', label: '小二寸', width: 35, height: 45 }
];

const bgOptions: BgOption[] = [
  { id: 'white', label: '白色', color: '#FFFFFF' },
  { id: 'blue', label: '蓝色', color: '#1890FF' },
  { id: 'red', label: '红色', color: '#FF4D4F' },
  { id: 'custom', label: '自定义', color: '#CCCCCC' }
];

const selectedSize = ref('1寸');
const selectedBg = ref('white');
const photoList = ref<number[]>([1, 2, 3]);

function nextStep() {
  if (currentStep.value < 5) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

function getSizeLabel(): string {
  return selectedSize.value;
}

function getSizeMm(): string {
  const size = sizeOptions.find((s) => s.id === selectedSize.value);
  return size ? `${size.width}×${size.height}mm` : '';
}

function getBgColor(): string {
  const bg = bgOptions.find((b) => b.id === selectedBg.value);
  return bg ? bg.color : '#FFFFFF';
}

function getBgLabel(): string {
  const bg = bgOptions.find((b) => b.id === selectedBg.value);
  return bg ? bg.label : '';
}

function removePhoto(index: number) {
  photoList.value.splice(index, 1);
}

function handleExport() {
  nextStep();
}

function resetFlow() {
  currentStep.value = 1;
  photoList.value = [1, 2, 3];
}
</script>

<style scoped lang="scss">
.photo-flow {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 16px;
}

.step-nav {
  display: flex;
  justify-content: space-between;
  background: #fff;
  border-radius: 8px;
  padding: 12px 8px;
  margin-bottom: 16px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e0e0e0;
  color: #999;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;

  .active & {
    background: #1677ff;
    color: #fff;
  }

  .completed & {
    background: #1677ff;
    color: #fff;
  }
}

.step-text {
  font-size: 10px;
  color: #999;

  .active & {
    color: #1677ff;
    font-weight: 500;
  }

  .completed & {
    color: #1677ff;
  }
}

.step-panel {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.panel-header {
  text-align: center;
  margin-bottom: 24px;
}

.panel-title {
  font-size: 18px;
  font-weight: 500;
  color: #333;
  margin: 0 0 8px;
}

.panel-desc {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.size-grid {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.size-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #1677ff;
  }

  &.selected {
    border-color: #1677ff;
    background: rgba(22, 119, 255, 0.05);
  }
}

.size-label {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.size-value {
  font-size: 12px;
  color: #999;
}

.bg-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.bg-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #1677ff;
  }

  &.selected {
    border-color: #1677ff;
    background: rgba(22, 119, 255, 0.05);
  }
}

.bg-color {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
  margin-bottom: 8px;
}

.bg-label {
  font-size: 12px;
  color: #333;
}

.photo-list {
  margin-bottom: 24px;
}

.photo-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.photo-preview {
  width: 50px;
  height: 60px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.photo-index {
  font-size: 18px;
  font-weight: 500;
  color: #999;
}

.photo-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.photo-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 2px;
}

.photo-size {
  font-size: 12px;
  color: #999;
}

.btn-delete {
  width: 24px;
  height: 24px;
  border: none;
  background: #ff4d4f;
  color: #fff;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-info {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;

  &:not(:last-child) {
    border-bottom: 1px solid #e8e8e8;
  }
}

.info-label {
  font-size: 14px;
  color: #999;
}

.info-value {
  font-size: 14px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #e8e8e8;
}

.btn-row {
  display: flex;
  gap: 12px;
}

.btn-primary,
.btn-success,
.btn-default {
  flex: 1;
  height: 44px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #1677ff;
  color: #fff;

  &:hover {
    background: #4096ff;
  }
}

.btn-success {
  background: #52c41a;
  color: #fff;

  &:hover {
    background: #73d13d;
  }
}

.btn-default {
  background: #fff;
  color: #666;
  border: 1px solid #d9d9d9;

  &:hover {
    color: #333;
    border-color: #999;
  }
}

.success-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #52c41a;
  color: #fff;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.success-title {
  font-size: 20px;
  font-weight: 500;
  color: #333;
  text-align: center;
  margin: 0 0 8px;
}

.success-desc {
  font-size: 14px;
  color: #999;
  text-align: center;
  margin: 0 0 24px;
}

.btn-primary {
  width: 100%;
}
</style>
