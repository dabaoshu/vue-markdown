<script lang="ts" setup>
import { computed } from 'vue';
import { ElInput, ElMessage, ElSlider, ElSwitch } from 'element-plus';
import { validateIntakeForm } from './intakeValidation';
import type { IntakeFormValue } from './types';

/**
 * 报障信息表：姓名、是否紧急、紧急原因、满意度。
 * 紧急为否时不渲染原因字段；满意度范围 0–100。
 */
const props = defineProps<{
  /** 当前表单值，由父级持有 */
  modelValue: IntakeFormValue;
}>();

const emit = defineEmits<{
  /** 同步字段修改 */
  'update:modelValue': [value: IntakeFormValue];
  /** 校验通过后提交当前值 */
  submit: [value: IntakeFormValue];
}>();

const name = computed({
  get: () => props.modelValue.name,
  set: (value: string) => patch({ name: value })
});

const urgent = computed({
  get: () => props.modelValue.urgent,
  set: (value: boolean) => patch({ urgent: value })
});

const reason = computed({
  get: () => props.modelValue.reason,
  set: (value: string) => patch({ reason: value })
});

const satisfaction = computed({
  get: () => props.modelValue.satisfaction,
  set: (value: number | number[]) => {
    const next = Array.isArray(value) ? value[0] ?? 0 : value;
    patch({ satisfaction: next });
  }
});

/**
 * 合并字段并回写父级。
 *
 * @param partial 要覆盖的字段
 */
function patch(partial: Partial<IntakeFormValue>): void {
  emit('update:modelValue', { ...props.modelValue, ...partial });
}

/**
 * 校验后提交。失败用 ElMessage.warning，不 emit submit。
 */
function onSubmit(): void {
  const result = validateIntakeForm(props.modelValue);
  if (!result.ok) {
    ElMessage.warning(result.message);
    return;
  }
  emit('submit', { ...props.modelValue });
}
</script>

<template>
  <form class="intake-form" @submit.prevent="onSubmit">
    <label class="intake-form__field">
      <span class="intake-form__label">姓名</span>
      <ElInput v-model="name" placeholder="请填写姓名" />
    </label>

    <label class="intake-form__field intake-form__field--switch">
      <span class="intake-form__label">是否紧急</span>
      <ElSwitch v-model="urgent" />
    </label>

    <label v-if="urgent" class="intake-form__field">
      <span class="intake-form__label">原因</span>
      <ElInput v-model="reason" type="textarea" :rows="3" placeholder="请填写原因" />
    </label>

    <div class="intake-form__field">
      <span class="intake-form__label">满意度 {{ satisfaction }}</span>
      <ElSlider v-model="satisfaction" :min="0" :max="100" />
    </div>

    <button class="intake-form__submit" type="submit">提交</button>
  </form>
</template>

<style scoped>
.intake-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.intake-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.intake-form__field--switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.intake-form__label {
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.intake-form__submit {
  align-self: flex-start;
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  color: #fff;
  background: #2563eb;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.intake-form__submit:hover {
  background: #1d4ed8;
}
</style>
