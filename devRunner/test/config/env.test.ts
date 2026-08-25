import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseEnvFile } from '../../server/config/config.js';

describe('parseEnvFile', () => {
  it('解析 KEY=VALUE 并忽略注释与空行', () => {
    const result = parseEnvFile(
      '# comment\n\nFOO=bar\nBAZ="quoted"\nQUX=\'single\'\n'
    );
    assert.deepEqual(result, {
      FOO: 'bar',
      BAZ: 'quoted',
      QUX: 'single'
    });
  });
});
