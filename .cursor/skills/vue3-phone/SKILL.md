---
name: vue3-phone
description: Vue 3 + TypeScript 开发规范和模式指南。适用于 phoneView 证件照处理应用的开发，提供 Composition API、组件结构、类型定义、状态管理等最佳实践。
---

# Vue 3 PhoneView 开发规范

## 技术栈

- Vue 3 (Composition API + `<script setup>`)
- TypeScript
- Vue Router
- Vite

## 组件规范

### 文件结构

```
src/
├── views/          # 页面组件
├── components/    # 可复用组件
├── composables/   # 组合式函数 (hooks)
├── types/         # 类型定义
├── router/        # 路由配置
```

### 组件模板

```vue
<template>
  <div class="component-name">
    <!-- 模板内容 -->
  </div>
</template>

<script lang="ts" setup>
/**
 * 组件名称：简要说明组件功能
 * @description 详细描述组件作用和使用场景
 */
import { ref, computed, onMounted } from 'vue';
import type { PropType } from 'vue';

// Props 定义
const props = defineProps<{
  /** 标题文本 */
  title: string;
  /** 数据列表 */
  items: string[];
}>();

// Emits 定义
const emit = defineEmits<{
  /** 点击事件 */
  (e: 'click', id: string): void;
}>();

// 响应式状态
const loading = ref(false);

// 计算属性
const isEmpty = computed(() => props.items.length === 0);

// 方法
function handleClick(id: string) {
  emit('click', id);
}

// 生命周期
onMounted(() => {
  // 初始化逻辑
});
</script>

<style scoped lang='scss'>
/* 组件样式 */
</style>
```

## 状态管理 (Composables)

### 单例 Store 模式

```typescript
import { reactive, toRefs, computed } from 'vue';
import type { Ref } from 'vue';

let storeInstance: ReturnType<typeof createStore> | null = null;

function createStore() {
  const state = reactive({
    // 状态字段
  });

  // 私有方法
  function findById(id: string) {
    return state.items.find(item => item.id === id);
  }

  // 公共方法
  function addItem(item: Item) {
    state.items.push(item);
  }

  // 计算属性
  const count = computed(() => state.items.length);

  return {
    ...toRefs(state),
    addItem,
    count,
  };
}

/**
 * 使用 store
 * @returns store 实例
 */
export function useStore() {
  if (!storeInstance) {
    storeInstance = createStore();
  }
  return storeInstance;
}

export type UseStoreReturn = ReturnType<typeof createStore>;
```

### 工厂函数模式

当需要多个独立实例时使用：

```typescript
export function createService(options: ServiceOptions) {
  const state = reactive({ /* ... */ });
  
  function doSomething() {
    // 业务逻辑
  }

  return { /* ... */ };
}
```

## 类型定义规范

### 接口定义

```typescript
/**
 * 数据项结构
 * @public
 */
export interface DataItem {
  /** 唯一标识 */
  id: string;
  /** 名称 */
  name: string;
  /** 状态 */
  status: 'pending' | 'success' | 'error';
}

/**
 * 状态结构
 * @public
 */
export interface State {
  /** 当前步骤 */
  step: number;
  /** 数据列表 */
  items: DataItem[];
  /** 加载状态 */
  loading: boolean;
}
```

### 预设配置

```typescript
export interface Preset {
  id: string;
  label: string;
  description: string;
  value: number;
}

export const PRESETS: Preset[] = [
  { id: 'a', label: '选项A', description: '描述', value: 1 },
  { id: 'b', label: '选项B', description: '描述', value: 2 },
];
```

## 路由配置

```typescript
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
```

## Vite 配置

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

## 常用代码片段

### 图片文件处理

```typescript
function createObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

function revokeObjectUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
```

### 表单提交

```typescript
async function handleSubmit() {
  loading.value = true;
  try {
    // 提交逻辑
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}
```

### 事件处理

```typescript
function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    // 处理文件
  }
}
```

## 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `PhotoUploader.vue` |
| 工具函数 | camelCase | `createObjectUrl` |
| 类型/接口 | PascalCase | `PhotoItem` |
| 常量 | UPPER_SNAKE | `MAX_SIZE` |
| CSS 类 | kebab-case | `.photo-item` |

## JSDoc 注释规范

```typescript
/**
 * 函数名称：简要说明函数功能
 *
 * @param {string} param1 参数说明
 * @param {number} param2 参数说明
 * @returns {Promise<void>} 返回值说明
 * @throws {Error} 可能的错误说明
 */
```

## 注意事项

1. **不要使用 Vue 2 选项式 API**，全部使用 Composition API
2. **使用 TypeScript**，为所有函数和组件添加类型
3. **优先使用 `<script setup>`** 语法糖
4. **资源清理**：使用 `onUnmounted` 清理定时器、事件监听器、blob URL
5. **响应式解构**：使用 `toRefs` 保持响应性
