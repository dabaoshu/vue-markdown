import { createRouter, createWebHistory } from 'vue-router';

/**
 * 文档站点路由
 */
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/pages/Home.vue')
    },
    {
      path: '/demo',
      name: 'Demo',
      component: () => import('@/pages/Demo.vue')
    },
    {
      path: '/scenes',
      name: 'Scenes',
      component: () => import('@/pages/Scenes.vue')
    },
    {
      path: '/changelog',
      name: 'Changelog',
      component: () => import('@/pages/Changelog.vue')
    },
    {
      path: '/test',
      name: 'Tests',
      component: () => import('@/pages/Tests.vue')
    },
    {
      path: '/test/remark-gfm',
      redirect: { path: '/test', query: { tab: 'gfm' } }
    },
    {
      path: '/test/remark-math',
      redirect: { path: '/test', query: { tab: 'math' } }
    },
    {
      path: '/test/code-highlight',
      redirect: { path: '/test', query: { tab: 'code' } }
    },
    {
      path: '/test/rehype-mermaid',
      redirect: { path: '/test', query: { tab: 'mermaid' } }
    },
    {
      path: '/test/remark-http-resource',
      redirect: { path: '/test', query: { tab: 'http' } }
    },
    {
      path: '/test/remark-think',
      redirect: { path: '/test', query: { tab: 'think' } }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
