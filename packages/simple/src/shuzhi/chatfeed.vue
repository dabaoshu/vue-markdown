<template>
  <section class="card">
    <h3>你感到不满意的主要原因是？（可多选）</h3>

    <!-- 选项列表 -->
    <ul class="list">
      <li v-for="o in options" :key="o.value">
        <label>
          <input type="checkbox" :checked="checked.has(o.value)" @change="toggle(o.value)" />
          <span>{{ o.label }}</span>
        </label>

        <!-- 其他原因输入框 -->
        <textarea v-if="o.value === 'other'" v-model="otherText" :disabled="!checked.has('other')" placeholder="请具体描述…"
          rows="2" />
      </li>
    </ul>

    <!-- 操作按钮 -->
    <div class="actions">
      <button class="btn primary" @click="handleSubmit">提交</button>
      <button class="btn" @click="handleReset">重置</button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

/* 选项池 */
const options = [
  { label: '答非所问', value: 'irrelevant' },
  { label: '内容不准确', value: 'inaccurate' },
  { label: '有不实内容', value: 'untrue' },
  { label: '敏感/有害回复', value: 'harmful' },
  { label: '存在价值观问题', value: 'values' },
  { label: '存在偏见歧视', value: 'bias' },
  { label: '其他原因或建议', value: 'other' }
]

/* 响应式数据 */
const checked = ref(new Set()) // 已勾选的 value 集合
const otherText = ref('')      // 其他原因文本

/* 切换选中状态 */
function toggle(val) {
  checked.value.has(val) ? checked.value.delete(val) : checked.value.add(val)
}

/* 提交 */
function handleSubmit() {
  if (checked.value.size === 0) {
    alert('请至少选择一项')
    return
  }
  const payload = {
    reasons: [...checked.value],
    other: checked.value.has('other') ? otherText.value.trim() : ''
  }
  console.log('提交数据:', payload)
  alert(`已提交：${JSON.stringify(payload, null, 2)}`)
}

/* 重置 */
function handleReset() {
  checked.value.clear()
  otherText.value = ''
}
</script>

<style scoped>
.card {
  max-width: 420px;
  margin: 40px auto;
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.list {
  list-style: none;
  padding: 0;
  margin: 16px 0;
}

.list li {
  margin: 8px 0;
}

label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

textarea {
  width: 100%;
  margin-top: 6px;
  resize: vertical;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn {
  padding: 6px 16px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.primary {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}
</style>