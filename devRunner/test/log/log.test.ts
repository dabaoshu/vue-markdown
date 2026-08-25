import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  pushLogLine,
  trimLogLines,
  type LogLine
} from '../../server/log/logBuffer.js';
import {
  collectHttpUrlsFromLog,
  mergePreviewUrls
} from '../../server/log/previewUrls.js';

describe('previewUrls', () => {
  it('从 Vite 日志提取 localhost 与端口', () => {
    const text = '  ➜  Local:   http://localhost:5173/\n';
    const { urls, port } = collectHttpUrlsFromLog(text);
    assert.equal(port, 5173);
    assert.ok(urls.some((u) => u.includes('localhost:5173')));
  });

  it('忽略特权端口（非 80/443）', () => {
    const { urls, port } = collectHttpUrlsFromLog('http://localhost:22/ssh');
    assert.equal(urls.length, 0);
    assert.equal(port, null);
  });

  it('mergePreviewUrls 补全本机 IP', () => {
    const merged = mergePreviewUrls(
      [],
      ['http://localhost:5173'],
      5173,
      ['192.168.1.8']
    );
    assert.equal(merged.port, 5173);
    assert.ok(merged.previewUrl?.includes('localhost'));
    assert.ok(merged.previewUrls.includes('http://192.168.1.8:5173'));
  });
});

describe('logBuffer', () => {
  it('pushLogLine 超出上限时从头部丢弃', () => {
    const lines: LogLine[] = [];
    for (let i = 0; i < 5; i++) {
      pushLogLine(lines, { stream: 'stdout', text: String(i), ts: i }, 3);
    }
    assert.equal(lines.length, 3);
    assert.equal(lines[0].text, '2');
    assert.equal(lines[2].text, '4');
  });

  it('trimLogLines 保留尾部', () => {
    const trimmed = trimLogLines([1, 2, 3, 4, 5], 3);
    assert.deepEqual(trimmed, [3, 4, 5]);
  });
});
