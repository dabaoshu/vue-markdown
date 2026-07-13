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
/** 包根目录，用于将绝对路径转为 dist 内相对路径 */
const PACKAGE_ROOT = path.normalize(`${__dirname}${path.sep}`);

/**
 * 将样式源文件路径转为 dist 内相对 CSS 路径
 * @param filePath Rollup 记录的原始样式路径（绝对或相对）
 */
const toDistCssPath = (filePath: string): string | undefined => {
  const normalized = path.normalize(filePath);
  if (normalized.startsWith(PACKAGE_ROOT)) {
    return path
      .relative(PACKAGE_ROOT, normalized)
      .replace(/\\/g, '/')
      .replace(/\.(scss|sass)$/, '.css');
  }
  if (!path.isAbsolute(normalized)) {
    return normalized.replace(/\\/g, '/').replace(/\.(scss|sass)$/, '.css');
  }
  return undefined;
};

/**
 * 库构建时 CSS 资源输出路径：按源码相对路径落盘（`.scss`/`.sass` → `.css`）。
 * 支持多模块各自产出样式，例如 `codeHighLight/ui/styles/codeLight.css`、`markdown/markdown.module.css`。
 *
 * @param assetInfo Rollup 预渲染资源信息
 */
const resolveLibCssAssetName: import('rollup').OutputOptions['assetFileNames'] = (
  assetInfo
) => {
  const isStyleAsset =
    assetInfo.names?.some((name) => /\.(css|scss|sass)$/.test(name)) ||
    assetInfo.name?.endsWith('.css');

  if (!isStyleAsset) {
    return 'assets/[name][extname]';
  }

  for (const originalPath of assetInfo.originalFileNames ?? []) {
    const distPath = toDistCssPath(originalPath);
    if (distPath) {
      return distPath;
    }
  }

  /** 无法追溯源码（例如被合并成单文件）时，避免覆盖其它模块样式 */
  const fallbackName = assetInfo.names?.[0] ?? assetInfo.name ?? 'style.css';
  return `assets/${fallbackName}`;
};

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
    /** 按模块拆分 CSS，避免多份 scss 被合并后只能输出到一个文件 */
    cssCodeSplit: true,
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
          dir: path.join(outDir, './es'),
          assetFileNames: resolveLibCssAssetName
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
          dir: path.join(outDir, './lib'),
          assetFileNames: resolveLibCssAssetName
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
    }
  }
});
