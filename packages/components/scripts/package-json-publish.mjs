/**
 * 发布时改写 package.json 入口：pnpm/npm 不会把 publishConfig.exports
 * 合并进正式包，导致 registry 上仍指向不存在的 ./index.ts。
 *
 * - prepare：备份后改为 dist 入口（由 prepack 调用）
 * - restore：从备份恢复源码入口（由 postpack 调用），保证 monorepo 继续用 .ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, '..');
const pkgPath = path.join(packageRoot, 'package.json');
const backupPath = path.join(packageRoot, 'package.json.publish-backup');

/** 发布到 npm 时的入口与子路径（必须落在 files: dist/ 内） */
const PUBLISH_OVERRIDES = {
  main: './dist/lib/index.js',
  module: './dist/es/index.mjs',
  types: './dist/es/index.d.ts',
  exports: {
    '.': {
      types: './dist/es/index.d.ts',
      import: './dist/es/index.mjs',
      require: './dist/lib/index.js',
      default: './dist/lib/index.js'
    },
    './vue-ui': {
      types: './dist/es/vue-ui.d.ts',
      import: './dist/es/vue-ui.mjs',
      require: './dist/lib/vue-ui.js',
      default: './dist/lib/vue-ui.js'
    },
    './markdown/styles': {
      import: './dist/es/markdown/styles/index.mjs',
      require: './dist/lib/markdown/styles/index.js',
      default: './dist/es/markdown/styles/index.mjs'
    },
    './markdown/styles/markdown.scss':
      './dist/es/markdown/styles/markdown.scss',
    './markdown/markdown.module.scss':
      './dist/es/markdown/styles/markdown.scss',
    './codeHighLight/ui/style': {
      import: './dist/es/codeHighLight/ui/style.mjs',
      require: './dist/lib/codeHighLight/ui/style.js',
      default: './dist/es/codeHighLight/ui/style.mjs'
    },
    './package.json': './package.json'
  },
  typesVersions: {
    '*': {
      'vue-ui': ['./dist/es/vue-ui.d.ts']
    }
  },
  sideEffects: [
    '**/*.scss',
    '**/*.css',
    '**/codeHighLight/ui/style.mjs',
    '**/codeHighLight/ui/style.js',
    '**/vue-codeHighLight.mjs',
    '**/vue-codeHighLight.js',
    '**/markdown/styles/index.mjs',
    '**/markdown/styles/index.js',
    '**/markdown/vue-markdown.mjs',
    '**/markdown/vue-markdown.js'
  ],
  /** 发布包只保留 registry / access，避免再塞一套无效的 exports */
  publishConfig: {
    access: 'public',
    registry: 'https://registry.npmjs.org/'
  }
};

/**
 * @param {'prepare' | 'restore'} mode
 */
function run(mode) {
  if (mode === 'prepare') {
    const raw = fs.readFileSync(pkgPath, 'utf8');
    fs.writeFileSync(backupPath, raw, 'utf8');
    const pkg = JSON.parse(raw);
    Object.assign(pkg, PUBLISH_OVERRIDES);
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    console.log(
      '[package-json-publish] prepare: 入口已改为 dist（备份 → package.json.publish-backup）'
    );
    return;
  }

  if (mode === 'restore') {
    if (!fs.existsSync(backupPath)) {
      console.warn(
        '[package-json-publish] restore: 未找到备份，跳过（可能已恢复）'
      );
      return;
    }
    fs.copyFileSync(backupPath, pkgPath);
    fs.unlinkSync(backupPath);
    console.log('[package-json-publish] restore: 已恢复 monorepo 源码入口');
    return;
  }

  console.error('用法: node package-json-publish.mjs <prepare|restore>');
  process.exit(1);
}

run(/** @type {'prepare' | 'restore'} */ (process.argv[2]));
