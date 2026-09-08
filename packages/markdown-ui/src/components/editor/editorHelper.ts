import { EditorView } from '@codemirror/view';

export class EditorHelper {
  private editorView: EditorView | undefined;

  constructor(editorView?: EditorView) {
    this.editorView = editorView;
  }

  setEditorView(editorView: EditorView) {
    this.editorView = editorView;
  }

  /**
   * 让编辑器重新获得焦点
   */
  private focus(): void {
    if (this.editorView) {
      this.editorView.focus();
    }
  }

  /**
   * 获取当前选中的文本
   * @returns 选中的文本内容
   */
  getSelectedText(): string {
    if (!this.editorView) return '';

    const { state } = this.editorView;
    const selection = state.selection.main;

    return state.sliceDoc(selection.from, selection.to);
  }

  /**
   * 判断文本是否包含指定的样式标记
   * @param text 要检查的文本
   * @param startMark 开始标记
   * @param endMark 结束标记
   * @returns 是否包含指定样式
   */
  hasStyle(text: string, startMark: string, endMark?: string): boolean {
    if (!startMark) return false;

    // 只有在明确指定使用相同标记时才将endMark设为startMark
    // 如果没有提供endMark，且不是成对标记，则不应默认使用startMark
    if (!endMark) {
      return text.startsWith(startMark);
    }

    return text.startsWith(startMark) && text.endsWith(endMark);
  }

  toggleStyle(styleConfig: {
    startMark: string;
    endMark?: string;
    useSymmetricMarks?: boolean;
    defaultText?: string;
    canToggle?: boolean;
  }): void {
    if (!this.editorView) {
      console.error('编辑器实例未初始化');
      return;
    }

    try {
      const { state, dispatch } = this.editorView;
      const selection = state.selection.main;
      const selectedText = state.sliceDoc(selection.from, selection.to);
      const isCursor = selection.from === selection.to;

      // 如果没有选中文本(光标位置)
      if (isCursor) {
        // 插入默认文本或带标记的"文本"
        dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert:
              styleConfig.defaultText ||
              `${styleConfig.startMark}文本${
                styleConfig.endMark ||
                (styleConfig.useSymmetricMarks ? styleConfig.startMark : '')
              }`
          },
          // 设置光标位置到插入文本后
          selection: {
            // 设置光标位置
            anchor:
              selection.from + // 从当前光标位置开始
              (styleConfig.defaultText
                ? styleConfig.defaultText.length // 如果有默认文本,光标位置就是默认文本的长度
                : styleConfig.startMark.length + // 否则是开始标记的长度
                  2 + // 加上"文本"两个字的长度
                  (styleConfig.endMark // 再加上结束标记的长度
                    ? styleConfig.endMark.length // 如果有结束标记就用结束标记的长度
                    : styleConfig.useSymmetricMarks // 如果使用对称标记
                    ? styleConfig.startMark.length // 就用开始标记的长度
                    : 0)) // 否则不加长度
          }
        });
        this.focus();
        return;
      }

      // 如果已有相同样式且允许切换,则移除样式
      if (
        styleConfig.canToggle &&
        this.hasStyle(selectedText, styleConfig.startMark, styleConfig.endMark)
      ) {
        // 计算需要移除的标记长度
        const startMarkLen = styleConfig.startMark.length;
        const endMarkLen = styleConfig.endMark
          ? styleConfig.endMark.length
          : styleConfig.useSymmetricMarks
          ? startMarkLen
          : 0;

        // 移除样式标记
        dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: selectedText.slice(
              startMarkLen,
              selectedText.length - endMarkLen
            )
          },
          selection: {
            anchor: selection.from,
            head: selection.to - (startMarkLen + endMarkLen)
          }
        });
      } else {
        // 如果没有样式,则添加样式
        dispatch({
          changes: {
            from: selection.from,
            to: selection.to,
            insert: `${styleConfig.startMark}${selectedText}${
              styleConfig.endMark ||
              (styleConfig.useSymmetricMarks ? styleConfig.startMark : '')
            }`
          },
          selection: {
            anchor: selection.from,
            head:
              selection.to +
              (styleConfig.startMark.length +
                (styleConfig.endMark
                  ? styleConfig.endMark.length
                  : styleConfig.useSymmetricMarks
                  ? styleConfig.startMark.length
                  : 0))
          }
        });
      }
      this.focus();
    } catch (error) {
      console.error('应用样式时出错:', error);
    }
  }

  /**
   * 插入不需要选中的内容（如标题、列表等）
   * @param text 要插入的文本
   * @param cursorOffset 光标偏移量
   */
  insertText(text: string, cursorOffset = 0): void {
    if (!this.editorView) {
      console.error('编辑器实例未初始化');
      return;
    }

    try {
      const { state, dispatch } = this.editorView;
      const selection = state.selection.main;

      // 创建一个简单的变更事务
      dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: text
        },
        selection: { anchor: selection.from + cursorOffset }
      });
      this.focus();
    } catch (error) {
      console.error('插入文本时出错:', error);
    }
  }

  /**
   * 处理快捷键
   * @param event 键盘事件
   * @param shortcuts 快捷键配置
   */
  handleKeydown(
    event: KeyboardEvent,
    shortcuts: Record<string, () => void>
  ): void {
    const key = event.key.toLowerCase();
    const ctrlKey = event.ctrlKey || event.metaKey;

    if (ctrlKey && shortcuts[key]) {
      event.preventDefault();
      shortcuts[key]();
      this.focus();
    }
  }
}
