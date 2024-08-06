import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx'; // 引入 Vue TSX 支持插件
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const { VITE_BASE_URL } = loadEnv(mode, process.cwd());
  return {
    plugins: [vue(), vueJsx()],
    base: VITE_BASE_URL,
    server: {
      port: 8001
    }
  };
});