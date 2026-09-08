import { createApp, h } from 'vue';
import './style.css';
import App2 from './App.vue';

import router from './router';

const app = createApp(App2);

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
