import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx'; // 引入 Vue TSX 支持插件
import path from 'path';
import { readFileSync } from 'fs';
import dts from 'vite-plugin-dts';

/**
 * 读取当前包的 package.json，并汇总需要 external 的依赖名。
 * external 仅来自运行时相关依赖：dependencies + peerDependencies。
 */
const getExternalPackages = (): string[] => {
  const packageJsonPath = path.resolve(__dirname, './package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  return [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {})
  ];
};

const EXTERNAL_PACKAGES = getExternalPackages();

/**
 * 判断模块是否应外置，避免把依赖打入产物。
 * 同时处理子路径导入，例如 `lodash/flow`。
 */
const isExternal = (id: string) =>
  EXTERNAL_PACKAGES.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));

/**
 * 兼容 monorepo 下可能出现的 Vite 类型重复实例问题。
 */
const createDtsPlugin = (options: Parameters<typeof dts>[0]) =>
  dts(options) as unknown as any;
// https://vitejs.dev/config/
const outDir = path.resolve(__dirname, './dist');
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    createDtsPlugin({
      outputDir: path.join(outDir, './es'),
      //指定使用的tsconfig.json为我们整个项目根目录下掉,如果不配置,你也可以在components下新建tsconfig.json
      tsConfigFilePath: path.resolve(__dirname, './tsconfig.json')
    }),
    //因为这个插件默认打包到es下，我们想让lib目录下也生成声明文件需要再配置一个
    createDtsPlugin({
      outputDir: path.join(outDir, './lib'),
      tsConfigFilePath: path.resolve(__dirname, './tsconfig.json')
    })
  ],
  build: {
    emptyOutDir: true,
    target: 'es2020',
    outDir: 'es',
    //压缩
    // minify: 'esbuild',
    minify: false,
    reportCompressedSize: false,
    copyPublicDir: false,
    rollupOptions: {
      // 忽略打包外部依赖，避免 dist 里生成 node_modules 镜像
      external: isExternal,
      treeshake: {
        moduleSideEffects: false
      },
      // preserveEntrySignatures: 'exports-only',
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
      entry: {
        index: path.resolve(__dirname, './index.ts'),
        'vue-ui': path.resolve(__dirname, './vue-ui.ts')
      },
      name: 'vue-markdown',
      fileName: 'vue-markdown'
      // formats: ['es', 'cjs']
    }
  }
});
