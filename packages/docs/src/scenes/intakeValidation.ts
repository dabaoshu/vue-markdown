import type { IntakeFormValue, IntakeValidation } from './types';

/**
 * 创建空的报障表单默认值。
 * satisfaction 默认 60，urgent 默认 false。
 */
export function createEmptyIntakeForm(): IntakeFormValue {
  return {
    name: '',
    urgent: false,
    reason: '',
    satisfaction: 60,
  };
}

/**
 * 校验报障表单：姓名必填；加急时原因必填。
 */
export function validateIntakeForm(value: IntakeFormValue): IntakeValidation {
  if (!value.name.trim()) {
    return { ok: false, message: '请填写姓名' };
  }

  if (value.urgent && !value.reason.trim()) {
    return { ok: false, message: '请填写原因' };
  }

  return { ok: true };
}
