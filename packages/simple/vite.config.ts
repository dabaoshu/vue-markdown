import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx'; // 引入 Vue TSX 支持插件
import path from 'path';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const { VITE_BASE_URL } = loadEnv(mode, process.cwd());
  return {
    plugins: [vue(), vueJsx(), cssInjectedByJsPlugin()],
    base: VITE_BASE_URL,
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/main.ts'),
        name: 'sdk',
        fileName: 'sdk'
      },
      minify: false
    },
    server: {
      port: 8001
    }
  };
});
