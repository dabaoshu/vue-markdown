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
      path: '/test/remark-think',
      name: 'RemarkThinkTest',
      component: () => import('@/pages/RemarkThinkTest.vue')
    },
    {
      path: '/test/remark-gfm',
      name: 'RemarkGfmTest',
      component: () => import('@/pages/RemarkGfmTest.vue')
    },
    {
      path: '/test/remark-math',
      name: 'RemarkMathTest',
      component: () => import('@/pages/RemarkMathTest.vue')
    },
    {
      path: '/test/code-highlight',
      name: 'CodeHighlightTest',
      component: () => import('@/pages/CodeHighlightTest.vue')
    },
    {
      path: '/test/rehype-mermaid',
      name: 'RehypeMermaidTest',
      component: () => import('@/pages/RehypeMermaidTest.vue')
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
