import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import type { Router } from 'vue-router';
import PhotoIdFlow from '@/views/PhotoIdFlow.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'PhotoIdFlow',
    component: PhotoIdFlow
  }
];

/**
 * 创建 phoneView 专用的 Vue Router 实例
 *
 * @returns {Router} 配置好的路由实例
 */
function createPhoneViewRouter(): Router {
  return createRouter({
    history: createWebHistory(import.meta.env.BASE_URL || '/'),
    routes
  });
}

const router = createPhoneViewRouter();

export { createPhoneViewRouter, routes };
export default router;

