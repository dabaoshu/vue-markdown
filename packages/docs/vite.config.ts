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
    target: 'es2020'
  },
  server: {
    port: 8002
  }
});
