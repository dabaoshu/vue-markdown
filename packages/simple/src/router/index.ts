import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw
} from 'vue-router';

/**
 * 所有业务路由配置
 *
 * 按文件夹名做路由隔离：
 * - /mdeditor        -> mdeditor/MarkdownEditor.vue
 * - /xunfei          -> xunfei/index.vue
 * - /people          -> people/people.vue
 * - /shuzhi          -> shuzhi/shuzhi.vue
 * - /testlogin       -> testlogin/App.vue
 * - /imagaBackground -> imagaBackground/cropperImage.vue
 * - /dirTree         -> Dirtree.vue
 * - /mermaid-card    -> mermaidCard/index.vue
 * - /iframe-demo    -> iframeDemo/index.vue
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/mdeditor',
    name: 'MdEditor',
    component: () => import('../mdeditor/MarkdownEditor.vue')
  },
  {
    path: '/xunfei',
    name: 'XunFei',
    component: () => import('../xunfei/index.vue')
  },
  {
    path: '/people',
    name: 'People',
    component: () => import('../people/people.vue')
  },

  {
    path: '/audio-useAsr',
    name: 'useAsr',
    component: () => import('../shuzhi/audio-transcribe-demo2.vue')
  },
  {
    path: '/audio-debug',
    name: 'AudioDebug',
    component: () => import('../shuzhi/audio-transcribe-demo.vue')
  },
  {
    path: '/testlogin',
    name: 'TestLogin',
    component: () => import('../testlogin/App.vue')
  },
  {
    path: '/imagaBackground',
    name: 'ImagaBackground',
    component: () => import('../imagaBackground/cropperImage.vue')
  },
  {
    path: '/dirTree',
    name: 'DirTree',
    component: () => import('../Dirtree.vue')
  },
  {
    path: '/modalpage',
    name: 'ModalPage',
    component: () => import('../modalpage/index.vue')
  },
  {
    path: '/iframe-embed',
    name: 'IframeEmbedDemo',
    component: () => import('../iframe_demo/index.vue')
  },
  {
    path: '/iframe-child',
    name: 'IframeChild',
    component: () => import('../iframe_demo/child.vue')
  },
  {
    path: '/mermaid-card',
    name: 'MermaidCardDemo',
    component: () => import('../mermaidCard/index.vue')
  },
  {
    path: '/',
    redirect: '/chatfeedok'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/mdeditor'
  }
];

/**
 * 创建并返回全局路由实例
 *
 * @returns 路由实例
 */
export const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
