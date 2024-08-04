import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx'; // 引入 Vue TSX 支持插件
import path from 'path';
import dts from 'vite-plugin-dts';
// https://vitejs.dev/config/
const outDir = path.resolve(__dirname, './dist');
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    dts({
      outputDir: path.join(outDir, './es'),
      //指定使用的tsconfig.json为我们整个项目根目录下掉,如果不配置,你也可以在components下新建tsconfig.json
      tsConfigFilePath: './tsconfig.json'
    }),
    //因为这个插件默认打包到es下，我们想让lib目录下也生成声明文件需要再配置一个
    dts({
      outputDir: path.join(outDir, './lib'),
      tsConfigFilePath: path.resolve(__dirname, './tsconfig.json')
    })
  ],
  build: {
    emptyOutDir: true,
    target: 'modules',
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
          preserveModulesRoot: __dirname,
          exports: 'named',
          //配置打包根目录
          dir: path.join(outDir, './es')
        },
        {
          //打包格式
          format: 'cjs',
          //打包后文件名
          entryFileNames: '[name].js',
          //让打包目录和我们目录对应
          preserveModules: true,
          preserveModulesRoot: __dirname,
          exports: 'named',
          //配置打包根目录
          dir: path.join(outDir, './lib')
        }
      ]
    },
    lib: {
      entry: path.resolve(__dirname, './index.ts'),
      name: 'vue-markdown',
      fileName: 'vue-markdown'
      // formats: ['es', 'cjs']
    }
  }
});
