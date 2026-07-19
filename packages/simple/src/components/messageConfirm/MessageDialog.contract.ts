import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(import.meta.dirname, 'MessageDialog.vue'), 'utf8');

assert.doesNotMatch(source, /@\/components\/myIcon/);
assert.match(source, /@element-plus\/icons-vue/);
assert.match(source, /WarningFilled/);
assert.match(source, /Close/);

console.log('message dialog icon contract: ok');
