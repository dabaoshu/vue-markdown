<template>
  <section class="card">
    <h3>谢谢您的夸夸，能把夸我的理由告诉我吗？（可多选）</h3>

    <!-- 夸夸选项 -->
    <ul class="list">
      <li v-for="o in options" :key="o.value">
        <label>
          <input type="checkbox" :checked="checked.has(o.value)" @change="toggle(o.value)" />
          <span>{{ o.label }}</span>
        </label>

        <!-- 其他理由附赠输入框 -->
        <textarea v-if="o.value === 'other'" v-model="otherText" :disabled="!checked.has('other')"
          placeholder="请写下其他夸夸的理由…" rows="2" />
      </li>
    </ul>

    <!-- 按钮组 -->
    <div class="actions">
      <button class="btn primary" @click="handleSubmit">提交</button>
      <button class="btn" @click="handleReset">重置</button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

/* 夸夸选项池 */
const options = [
  { label: '回答准确', value: 'accurate' },
  { label: '生成内容丰富', value: 'rich' },
  { label: '回答速度快', value: 'fast' },
  { label: '记忆准确', value: 'memory' },
  { label: '实用性强', value: 'useful' },
  { label: '专业度高', value: 'professional' },
  { label: '其他夸夸的理由', value: 'other' }
]

/* 响应式数据 */
const checked = ref(new Set()) // 已勾选的 value 集合
const otherText = ref('')      // 其他理由文本

/* 切换选中状态 */
function toggle(val) {
  checked.value.has(val) ? checked.value.delete(val) : checked.value.add(val)
}

/* 提交 */
function handleSubmit() {
  if (checked.value.size === 0) {
    alert('请至少选择一项夸夸理由哦~')
    return
  }
  const payload = {
    praises: [...checked.value],
    other: checked.value.has('other') ? otherText.value.trim() : ''
  }
  console.log('夸夸数据:', payload)
  alert(`已收到夸夸：${JSON.stringify(payload, null, 2)}`)
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