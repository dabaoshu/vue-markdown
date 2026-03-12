import { createApp } from 'vue';
import type { App as VueApp } from 'vue';
import App from './App.vue';
import router from './router';
import 'vant/lib/index.css';

import {
  Button,
  ConfigProvider,
  Uploader,
  Form,
  Field,
  Cell,
  CellGroup,
  Checkbox,
  CheckboxGroup,
  Dialog,
  Toast,
  Loading
} from 'vant';

/**
 * 初始化并挂载 phoneView 手机端证件照应用
 *
 * @returns {VueApp<Element>} 已挂载的 Vue 应用实例
 */
function bootstrapApp(): VueApp<Element> {
  const app = createApp(App);

  app.use(router);

  // 注册常用的 Vant 组件，后续页面可直接使用
  app
    .use(ConfigProvider)
    .use(Button)
    .use(Uploader)
    .use(Form)
    .use(Field)
    .use(Cell)
    .use(CellGroup)
    .use(Checkbox)
    .use(CheckboxGroup)
    .use(Dialog)
    .use(Toast)
    .use(Loading);

  app.mount('#app');

  return app;
}

// 默认直接启动应用，方便独立运行调试
bootstrapApp();

export { bootstrapApp };

