import assert from 'node:assert/strict';
import { groupWorkbenchTabs } from '../src/examples/workbench/groupWorkbenchTabs';
import type { WorkbenchTab } from '../src/examples/workbench/types';

const tabs: WorkbenchTab[] = [
  { id: 'gfm', label: 'GFM', category: 'basic' },
  { id: 'math', label: '数学', category: 'basic' },
  { id: 'mermaid', label: 'Mermaid', category: 'diagram', categoryLabel: '图表' },
  { id: 'think', label: 'Think', category: 'extend' }
];

const groups = groupWorkbenchTabs(tabs);
assert.equal(groups.length, 3);
assert.equal(groups[0]?.id, 'basic');
assert.equal(groups[0]?.label, '基础能力');
assert.deepEqual(
  groups[0]?.tabs.map((tab) => tab.id),
  ['gfm', 'math']
);
assert.equal(groups[1]?.label, '图表');
assert.equal(groups[2]?.label, '扩展');

const unlabeled = groupWorkbenchTabs([{ id: 'x', label: 'X' }]);
assert.equal(unlabeled[0]?.id, '_default');
assert.equal(unlabeled[0]?.label, '其他');

console.log('groupWorkbenchTabs: ok');
