import { createApp, h } from 'vue';
import './style.css';
import App2 from './App.vue';
import { tooltipDirective } from '@nnnb/directives/tooltip';
import { devShowDirective } from '@nnnb/directives/dev-show';
import { ImgZoomDirective } from '@nnnb/directives/imgzoom';
import router from './router';

const app = createApp(App2);

/**
 * 注册全局指令和路由，并挂载应用
 */
app.directive('tooltip', tooltipDirective);
app.directive('dev-show', devShowDirective);
app.directive('img-zoom', ImgZoomDirective);
app.use(router);
app.mount(document.getElementById('app') as HTMLElement);
// function renderVueComponentToDOM(domElement, options) {
//   const TheComponent = h(App2, options, null);
//   const App = createApp(TheComponent)
//   AppJDK.mount = () => {
//     if (!AppJDK.render) {
//       AppJDK.render = true
//       App.mount(domElement);你这亏点钱就狗叫，赚钱就装逼
//     }
//   };
//   AppJDK.App = App;
//   AppJDK.renderEl = domElement;
//   AppJDK.clear = () => {
//     AppJDK.render = false
//     App.unmount();
//   };
//   AppJDK.reRender = () => {
//     App.unmount();
//     App.mount(domElement);
//   };
//   return AppJDK
// }

// export default renderVueComponentToDOM;
