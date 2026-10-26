import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import remarkGfm from 'remark-gfm';
import { preprocessLaTeX, preprocessMath } from '../../../../components/markdown/utils';
import { createProcessor, createFile, postProcessHast } from '../../../../components/markdown/engine/markdown';

// 代码还原必须按字面值处理 JavaScript replace 的特殊替换字符。
for (const token of ['$$', '$&', '$`', "$'"]) {
  const source = ['前文', '```text', token, String.raw`\[x\]`, '```', '后文'].join('\n');
  assert.equal(preprocessLaTeX(source), source, `代码中的 ${token} 必须原样保留`);
}

const mathSource = ['公式：\\[x+1\\]', '```text', '$$x$$', '```'].join('\n');
assert.equal(preprocessLaTeX(mathSource), ['公式：$$x+1$$', '```text', '$$x$$', '```'].join('\n'));

// 重复的三反引号片段中包含 $` 时，旧逻辑会不断复制已还原的前缀。
const repeated = Array.from({ length: 32 }, (_, i) =>
  ['段落 ' + i, '```text', '$`', '```'].join('\n')
).join('\n\n');
const sources = [repeated];
if (process.argv[2]) sources.push(readFileSync(process.argv[2], 'utf8'));
for (const source of sources) {
  const start = performance.now();
  const actual = preprocessLaTeX(source);
  // 先比较长度，避免失败时打印膨胀后的巨量文本。
  assert.equal(actual.length, source.length, '预处理不应放大不含待转换公式的输入');
  assert.ok(actual === source, '原始内容必须完整保留');
  const math = preprocessMath();
  const options = { children: actual, remarkPlugins: [remarkGfm, ...math.remarkPlugins], rehypePlugins: math.rehypePlugins };
  const processor = createProcessor(options);
  const file = createFile(options);
  const hast = postProcessHast(processor.runSync(processor.parse(file), file), options);
  assert.equal(hast.type, 'root');
  console.log(`通过：${source.length} 字符完整保留并完成渲染树转换，${Math.round(performance.now() - start)}ms`);
}
console.log('通过：替换特殊字符、代码隔离、公式转换和重复片段回归');
