import type { EditorHelper } from './editorHelper';

/**
 * 工具栏项结构
 */
export interface ToolbarItem {
  icon: string;
  tooltip: string;
  action: () => void;
}

/**
 * 创建工具栏操作项
 * @param editorHelper 编辑器辅助实例
 * @returns 工具栏项列表
 */
export function createToolbarItems(editorHelper: EditorHelper): ToolbarItem[] {
  return [
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
  ];
}

/**
 * 创建快捷键映射
 * @param editorHelper 编辑器辅助实例
 * @returns 快捷键动作映射
 */
export function createShortcuts(editorHelper: EditorHelper): Record<string, () => void> {
  return {
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
}
