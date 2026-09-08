import { readFileSync } from 'node:fs';
import path from 'node:path';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig } from 'vite';

const packageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')
) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const externalPackages = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {})
];

const isExternal = (id: string) =>
  externalPackages.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));

const outDir = path.resolve(__dirname, 'dist');

export default defineConfig({
  plugins: [
    vue(),
    vueJsx()
  ],
  build: {
    emptyOutDir: true,
    target: 'es2020',
    outDir,
    cssCodeSplit: false,
    minify: false,
    copyPublicDir: false,
    reportCompressedSize: false,
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        examples: path.resolve(__dirname, 'src/examples/index.ts')
      },
      name: 'markdown-ui',
      formats: ['es']
    },
    rollupOptions: {
      external: isExternal,
      output: {
        format: 'es',
        dir: outDir,
        entryFileNames: 'es/[name].mjs',
        assetFileNames: 'style.css',
        preserveModules: true,
        preserveModulesRoot: __dirname,
        exports: 'named'
      }
    }
  }
});
