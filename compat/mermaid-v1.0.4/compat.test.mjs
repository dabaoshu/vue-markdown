import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// 用导出函数替身测试旧调用契约，无需为内网补丁安装测试依赖。
const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const calls = [];
const canvas = {};
const rasterize = async (...args) => { calls.push(args); return canvas; };
const js = ts.transpile(source.replace(
  /import \{ rasterizeSvgToCanvas \} from '\.\/svgExport';/,
  'const rasterizeSvgToCanvas = globalThis.__compatRasterize;'
), { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 });
globalThis.__compatRasterize = rasterize;
const { default: capture } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
delete globalThis.__compatRasterize;
const svg = { namespaceURI: 'http://www.w3.org/2000/svg', localName: 'svg' };

test('旧容器调用返回 Canvas，并映射旧导出参数', async () => {
  const root = { querySelector: (selector) => selector === 'svg' ? svg : null };
  assert.equal(await capture(root, { scale: 3, backgroundColor: '#abc', useCORS: true, allowTaint: false, logging: false }), canvas);
  assert.deepEqual(calls.at(-1), [svg, { pixelRatio: 3, backgroundColor: '#abc', stripForeignObject: true }]);
});

test('可直接传入 SVG，默认采用两倍白底导出', async () => {
  await capture(svg);
  assert.deepEqual(calls.at(-1), [svg, { pixelRatio: 2, backgroundColor: '#ffffff', stripForeignObject: true }]);
});

test('无 SVG 时明确失败，不调用截图或导出', async () => {
  const count = calls.length;
  await assert.rejects(capture({ querySelector: () => null }), /SVG/);
  assert.equal(calls.length, count);
});

test('无效缩放参数回退到默认值', async () => {
  for (const scale of [0, -1, NaN, Infinity]) {
    await capture(svg, { scale });
    assert.equal(calls.at(-1)[1].pixelRatio, 2);
  }
});

test('实际导出链路限制长边，剪贴板拒绝时及时失败并释放 URL', async () => {
  const exportSource = readFileSync(new URL('./svgExport.ts', import.meta.url), 'utf8');
  const exportJs = ts.transpile(exportSource, { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 });
  const { rasterizeSvgToCanvas, copySvgAsPng } = await import(`data:text/javascript;base64,${Buffer.from(exportJs).toString('base64')}`);
  const saved = new Map();
  const replace = (key, value) => {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  };
  let created = 0;
  let revoked = 0;
  const createUrl = URL.createObjectURL;
  const revokeUrl = URL.revokeObjectURL;
  const exportedCanvas = {
    getContext: () => ({ setTransform() {}, fillRect() {}, drawImage() {} }),
    toBlob: (callback) => callback(new Blob(['png'], { type: 'image/png' }))
  };
  const cloned = {
    viewBox: { baseVal: { width: 10000, height: 5000 } },
    style: { removeProperty() {} },
    querySelectorAll: () => [],
    getAttribute: () => '0 0 10000 5000',
    setAttribute() {}, insertBefore() {}
  };
  const original = { cloneNode: () => cloned };
  try {
    replace('document', { createElementNS: () => ({}), createElement: () => exportedCanvas });
    replace('XMLSerializer', class { serializeToString() { return '<svg/>'; } });
    replace('Image', class { set src(value) { queueMicrotask(() => this.onload()); } });
    replace('ClipboardItem', class {});
    replace('window', { ClipboardItem: globalThis.ClipboardItem });
    replace('navigator', { clipboard: { write: async () => { throw new Error('剪贴板拒绝'); } } });
    URL.createObjectURL = () => { created++; return 'blob:test'; };
    URL.revokeObjectURL = () => { revoked++; };
    const result = await rasterizeSvgToCanvas(original, { pixelRatio: 2 });
    assert.equal(result.width, 4096);
    assert.equal(result.height, 2048);
    await assert.rejects(copySvgAsPng(original), /剪贴板拒绝/);
    assert.equal(created, 2);
    assert.equal(revoked, created);
  } finally {
    URL.createObjectURL = createUrl;
    URL.revokeObjectURL = revokeUrl;
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
