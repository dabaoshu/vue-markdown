import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import path from 'path';

/**
 * Vite 配置：为 phoneView 手机端证件照模块提供开发与打包能力
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [vue(), vueJsx()],
    base: env.VITE_BASE_URL || '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/entry.ts'),
        name: 'phoneView',
        fileName: 'phone-view'
      },
      minify: false
    },
    server: {
      port: 8002
    }
  };
});

