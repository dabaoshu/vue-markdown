import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import path from 'path';

/**
 * GitHub Pages 子路径：/vue-markdown/
 * 本地开发使用根路径 /
 */
const base = process.env.GITHUB_ACTIONS ? '/vue-markdown/' : '/';

export default defineConfig({
  plugins: [vue(), vueJsx()],
  base,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        /**
         * 仅拆分 node_modules 中的重型依赖。
         * 不要对 src 下的 Demo/编辑器做 manualChunks —— 否则 Rollup 可能把 Vue 运行时
         * 复用到异步 chunk，入口 chunk 反向依赖它，再叠加 vendor 交叉引用会在生产环境报错。
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (id.includes('mermaid') || id.includes('cytoscape')) {
            return 'vendor-mermaid';
          }
          if (id.includes('katex')) {
            return 'vendor-katex';
          }
          if (id.includes('element-plus')) {
            return 'vendor-element-plus';
          }
          if (
            id.includes('@codemirror') ||
            id.includes('/codemirror/') ||
            id.includes('vue-codemirror')
          ) {
            return 'vendor-codemirror';
          }
          return undefined;
        }
      }
    }
  },
  server: {
    port: 8002
  }
});
