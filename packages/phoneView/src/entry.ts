import type { App as VueApp } from 'vue';
import { bootstrapApp } from './main';
import PhotoIdFlow from './views/PhotoIdFlow.vue';
import { createPhoneViewRouter } from './router';
import { usePhotoStore } from './composables/usePhotoStore';

export type { UsePhotoStoreReturn } from './composables/usePhotoStore';
export { PhotoIdFlow, createPhoneViewRouter, usePhotoStore };

/**
 * 对外暴露的挂载方法，方便在宿主系统中以独立入口方式使用。
 *
 * @param {HTMLElement} container 挂载容器 DOM
 * @returns {VueApp<Element>} Vue 应用实例
 */
export function mountPhoneView(container: HTMLElement): VueApp<Element> {
  const app = bootstrapApp();
  app.unmount();
  app.mount(container);
  return app;
}

