<template>
  <div class="markdown-editor">
    <div class="toolbar">
      <div v-for="(item, index) in toolbarItems" :key="index" class="toolbar-item" :title="item.tooltip"
        @click="item.action()">
        <span class="toolbar-icon">{{ item.icon }}</span>
      </div>
      <div class="toolbar-item" @click="togglePreview" :title="showPreview ? '隐藏预览' : '显示预览'">
        <span class="toolbar-icon">
          {{ showPreview ? '隐藏预览' : '显示预览' }}
        </span>
      </div>
    </div>
    <div class="editor-container">
      <Codemirror v-model="code" placeholder="请输入Markdown内容..." :style="{ height: '400px' }" :autofocus="true"
        :indent-with-tab="true" :tab-size="2" :extensions="extensions" @ready="handleReady" @change="handleChange" />
    </div>
    <div class="preview-container" v-if="showPreview">
      <div class="preview-title">预览</div>
      <VueMarkdown class="preview-content" :source="code"></VueMarkdown>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, shallowRef, onMounted, computed, onBeforeUnmount } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import VueMarkdown from '../components/markdown';
import { EditorHelper } from './editorHelper';
const formItems = `
  `;
// 编辑器视图引用
const editorView = shallowRef();
// 编辑器内容
//   const code = ref(`
// <think>
//   qqqq12312312312312
// </think>
// <think>
//   qqqq1312312
// </think>
// <think>
//   qqqq312321312
// </think>
// # 4646546
// # 44
// 444
//   `);
const code = ref(`
# Template Form Example
:::form
\`\`\`json 
[
  {
    "templateType": "VkfInput",
    "label": "姓名",
    "prop": "name"
  },
  {
    "templateType": "VkfSwitch",
    "label": "是否喜欢",
    "prop": "like"
  },
  {
    "label": "满意度",
    "prop": "degree",
    "templateType": "VkfSlider",
    "min": 0,
    "max": 100
  },
  {
    "templateIf": "return data.like",
    "label": "原因",
    "templateType": "VkfInput",
    "prop": "reason"

  }
]
\`\`\`
:::
`);

// code.value= `


// 行内：这是 <think>1</think> 行内 think 标签。
// `
// 是否显示预览
const showPreview = ref(true);
// 编辑器助手实例
const editorHelper = new EditorHelper();

// 编辑器扩展
const extensions = [
  markdown(),
  EditorView.lineWrapping,
  keymap.of([indentWithTab, ...defaultKeymap])
];

// 编辑器就绪回调
function handleReady(payload: any) {
  editorView.value = payload.view;
  editorHelper.setEditorView(payload.view);
}

// 编辑器内容变化回调
function handleChange(value: string) {
  code.value = value;
}

// 切换预览
function togglePreview() {
  showPreview.value = !showPreview.value;
}

// 工具栏配置
const toolbarItems = computed(() => [
  {
    icon: 'H1',
    tooltip: '一级标题',
    action: () => editorHelper.insertText('# ', 2)
  },
  {
    icon: 'H2',
    tooltip: '二级标题',
    action: () => editorHelper.insertText('## ', 3)
  },
  {
    icon: 'B',
    tooltip: '粗体',
    action: () =>
      editorHelper.toggleStyle({
        startMark: '**',
        useSymmetricMarks: true,
        canToggle: true
      })
  },
  {
    icon: 'I',
    tooltip: '斜体',
    action: () =>
      editorHelper.toggleStyle({
        startMark: '_',
        useSymmetricMarks: true,
        canToggle: true
      })
  },
  {
    icon: '~',
    tooltip: '删除线',
    action: () =>
      editorHelper.toggleStyle({
        startMark: '~~',
        useSymmetricMarks: true,
        canToggle: true
      })
  },
  {
    icon: '[L]',
    tooltip: '链接',
    action: () =>
      editorHelper.toggleStyle({
        startMark: '[',
        endMark: '](url)',
        defaultText: '[链接文字](url)',
        canToggle: true
      })
  },
  {
    icon: '![I]',
    tooltip: '图片',
    action: () =>
      editorHelper.toggleStyle({
        startMark: '![',
        endMark: '](url)',
        defaultText: '![图片描述](url)',
        canToggle: true
      })
  },
  {
    icon: '`',
    tooltip: '代码',
    action: () =>
      editorHelper.toggleStyle({
        startMark: '`',
        useSymmetricMarks: true,
        canToggle: true
      })
  },
  {
    icon: '```',
    tooltip: '代码块',
    action: () =>
      editorHelper.toggleStyle({
        startMark: '```\n',
        endMark: '\n```',
        defaultText: '```\n代码\n```',
        canToggle: true
      })
  },
  {
    icon: '>',
    tooltip: '引用',
    action: () => editorHelper.insertText('> ', 2)
  },
  {
    icon: '•',
    tooltip: '无序列表',
    action: () => editorHelper.insertText('- ', 2)
  },
  {
    icon: '1.',
    tooltip: '有序列表',
    action: () => editorHelper.insertText('1. ', 3)
  }
]);

// 快捷键配置
const shortcuts = {
  b: () =>
    editorHelper.toggleStyle({
      startMark: '**',
      useSymmetricMarks: true,
      canToggle: true
    }),
  i: () =>
    editorHelper.toggleStyle({
      startMark: '_',
      useSymmetricMarks: true,
      canToggle: true
    }),
  k: () =>
    editorHelper.toggleStyle({
      startMark: '[',
      endMark: '](url)',
      defaultText: '[链接文字](url)',
      canToggle: true
    })
};

// 监听快捷键
onMounted(() => {
  window.addEventListener('keydown', (e) =>
    editorHelper.handleKeydown(e, shortcuts)
  );
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', (e) =>
    editorHelper.handleKeydown(e, shortcuts)
  );
});
</script>

<style scoped>
.markdown-editor {
  display: flex;
  flex-direction: column;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  padding: 8px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.toolbar-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  min-width: 32px;
  margin-right: 8px;
  margin-bottom: 4px;
  padding: 0 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.toolbar-item:hover {
  background-color: #e0e0e0;
}

.toolbar-icon {
  font-size: 14px;
}

.editor-container {
  flex: 1;
  min-height: 200px;
  border-bottom: 1px solid #ddd;
}

.preview-container {
  padding: 16px;
  background-color: #fff;
}

.preview-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
}

.preview-content {
  min-height: 200px;
  padding: 8px;
  border: 1px solid #eee;
  border-radius: 4px;
}

:deep(.cm-editor) {
  height: 100%;
}

:deep(.cm-scroller) {
  overflow: auto;
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
}
</style>
