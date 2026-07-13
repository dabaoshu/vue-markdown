<template>
  <Codemirror
    :model-value="modelValue"
    placeholder="在此编辑 Markdown…"
    :style="{ height: '100%' }"
    :indent-with-tab="true"
    :tab-size="2"
    :extensions="extensions"
    @update:model-value="emit('update:modelValue', $event)"
    @ready="emit('ready', $event)"
  />
</template>

<script lang="ts" setup>
import { Codemirror } from 'vue-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';

defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  ready: [payload: { view: EditorView }];
}>();

const editorTheme = EditorView.theme({
  '&': { direction: 'ltr', height: '100%' },
  '.cm-scroller': { direction: 'ltr', fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px' },
  '.cm-content': { direction: 'ltr', unicodeBidi: 'plaintext', padding: '12px 0' },
  '.cm-gutters': { direction: 'ltr', background: '#f8fafc', borderRight: '1px solid #e2e8f0' },
  '.cm-activeLine': { background: '#f1f5f9' }
});

const extensions = [
  markdown(),
  EditorView.lineWrapping,
  editorTheme,
  keymap.of([indentWithTab, ...defaultKeymap])
];
</script>

<style scoped>
:deep(.cm-editor) {
  height: 100%;
  flex: 1;
}
</style>
