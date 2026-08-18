import { build } from 'esbuild';
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.join(pkgRoot, 'dist', 'index.js');
const webDir = path.join(pkgRoot, 'web');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * 读取 web/ 为内嵌资源映射
 */
function loadWebAssets() {
  /** @type {Record<string, { contentType: string, body: string }>} */
  const assets = {};
  for (const name of readdirSync(webDir)) {
    const filePath = path.join(webDir, name);
    if (!statSync(filePath).isFile()) {
      continue;
    }
    const ext = path.extname(name);
    const key = `/${name.replace(/\\/g, '/')}`;
    assets[key] = {
      contentType: MIME[ext] || 'application/octet-stream',
      body: readFileSync(filePath, 'utf8')
    };
  }
  return assets;
}

mkdirSync(path.join(pkgRoot, 'dist'), { recursive: true });

const webAssets = loadWebAssets();

/**
 * 把服务端、依赖、前端静态页打进单个 JS
 */
await build({
  absWorkingDir: pkgRoot,
  entryPoints: ['server/index.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
  banner: {
    js: '#!/usr/bin/env node'
  },
  plugins: [
    {
      name: 'embed-web',
      setup(buildApi) {
        buildApi.onLoad({ filter: /[\\/]webAssets\.ts$/ }, () => ({
          contents: `export const WEB_ASSETS = ${JSON.stringify(webAssets)};\n`,
          loader: 'js'
        }));
      }
    }
  ]
});

console.log(`[dev-runner] 已打包: ${outfile}`);
console.log(`[dev-runner] 内嵌前端: ${Object.keys(webAssets).join(', ')}`);
const bundled = readFileSync(outfile, 'utf8');
if (bundled.includes('node_modules')) {
  throw new Error('打包产物仍包含 node_modules 字样，请检查依赖是否被打进注释或动态 require');
}

const distDir = path.join(pkgRoot, 'dist');
const distWeb = path.join(distDir, 'web');
cpSync(webDir, distWeb, { recursive: true });
copyFileSync(
  path.join(pkgRoot, '.env.example'),
  path.join(distDir, '.env.example')
);
copyFileSync(
  path.join(pkgRoot, 'dev-runner.config.example.js'),
  path.join(distDir, 'dev-runner.config.example.js')
);
console.log('[dev-runner] 运行: node dist/index.js');
console.log('[dev-runner] 整包目录: dist/ （index.js + web/ + 配置模板）');
