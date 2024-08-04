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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    build: {
      outDir: 'es',
      //压缩
      minify: false,
      rollupOptions: {
        //忽略打包vue文件
        external: ['vue'],
        output: [
          {
            //打包格式
            format: 'es',
            //打包后文件名
            entryFileNames: '[name].mjs',
            //让打包目录和我们目录对应
            preserveModules: true,
            exports: 'named',
            //配置打包根目录
            dir: path.resolve(__dirname, './dist/es')
          },
          {
            //打包格式
            format: 'cjs',
            //打包后文件名
            entryFileNames: '[name].js',
            //让打包目录和我们目录对应
            preserveModules: true,
            exports: 'named',
            //配置打包根目录
            dir: path.resolve(__dirname, './dist/lib')
          }
        ]

        // output: {
        //   globals: {
        //     vue: 'Vue'
        //   },
        //   dir: 'dist'
        // }
      },
      lib: {
        entry: path.resolve(__dirname, 'packages/index.ts'),
        name: 'vue-markdown',
        fileName: 'vue-markdown',
        formats: ['es', 'umd', 'cjs']
      }
      // lib: {
      //   entry: path.resolve(__dirname, 'src/index.ts'),
      //   name: 'vue-markdown'
      // }
    }
    // css: {
    //   preprocessorOptions: {
    //     scss: {
    //       additionalData: `@use "@/styles/variables.scss" as *;`
    //     }
    //   }
    // }
  };
});
