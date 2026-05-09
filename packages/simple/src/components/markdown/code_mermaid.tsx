import {
  CopyDocument,
  Download,
  FullScreen,
  RefreshRight,
  ZoomIn,
  ZoomOut
} from '@element-plus/icons-vue';
import { CodeHighLight, MermaidBlock } from '@nnnb/markdown/vue-ui';
import { ElButton, ElMessage, ElTooltip } from 'element-plus';
import { defineComponent, nextTick, onBeforeUnmount, PropType, ref } from 'vue';
import html2canvas from 'html2canvas';
import MermaidCanvasViewport, {
  MermaidCanvasViewportExpose
} from './MermaidCanvasViewport';

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
const SCALE_STEP = 0.1;
const COPY_RESET_MS = 2000;
const INLINE_PREVIEW_HEIGHT = 320;

/**
 * Mermaid 展示模式类型
 */
type MermaidViewMode = 'preview' | 'code';

/**
 * Mermaid 交互增强组件
 * @description 提供悬浮工具栏、局部缩放、代码/预览切换、弹窗预览、下载和复制能力
 */
export const MermaidInteractiveBlock = defineComponent({
  name: 'MermaidInteractiveBlock',
  props: {
    code: {
      type: String,
      required: true
    },
    cacheKey: {
      type: String,
      required: false
    },
    mermaidConfig: {
      type: Object,
      required: false
    },
    renderSvg: {
      type: Boolean,
      required: false,
      default: true
    },
    className: {
      type: String,
      required: false,
      default: 'mermaid-block'
    },
    streamLoading: {
      type: Boolean,
      required: false,
      default: false
    },
    loadingText: {
      type: String,
      required: false
    },
    errorText: {
      type: String,
      required: false
    },
    streamPendingText: {
      type: String,
      required: false
    },
    showLoading: {
      type: Boolean,
      required: false,
      default: true
    },
    loadingDelayMs: {
      type: Number,
      required: false
    },
    minLoadingMs: {
      type: Number,
      required: false
    },
    streamErrorGraceMs: {
      type: Number,
      required: false
    },
    onRender: {
      type: Function as PropType<() => void>,
      required: false
    },
    onError: {
      type: Function as PropType<(error: Error) => void>,
      required: false
    },
    workerFactory: {
      type: Function as PropType<() => Worker>,
      required: false
    }
  },
  setup(props) {
    const mode = ref<MermaidViewMode>('preview');
    const inlineViewportRef = ref<MermaidCanvasViewportExpose | null>(null);
    const inlineRootRef = ref<HTMLElement | null>(null);
    const dialogScale = ref(1);
    const dialogVisible = ref(false);
    const inlineCopied = ref(false);
    const dialogCopied = ref(false);
    const codeCopied = ref(false);
    const dialogRootRef = ref<HTMLElement | null>(null);

    let inlineCopyTimer = 0;
    let dialogCopyTimer = 0;
    let codeCopyTimer = 0;

    /**
     * 清理复制反馈定时器
     * @returns {void}
     */
    function clearTimers(): void {
      window.clearTimeout(inlineCopyTimer);
      window.clearTimeout(dialogCopyTimer);
      window.clearTimeout(codeCopyTimer);
    }

    /**
     * 限制缩放比例范围
     * @param value 缩放值
     * @returns {number}
     */
    function clampScale(value: number): number {
      if (value < MIN_SCALE) return MIN_SCALE;
      if (value > MAX_SCALE) return MAX_SCALE;
      return Number(value.toFixed(2));
    }

    /**
     * 调整缩放比例
     * @param target 目标窗口
     * @param delta 增量
     * @returns {void}
     */
    function changeScale(target: 'inline' | 'dialog', delta: number): void {
      if (target === 'inline') {
        if (delta > 0) {
          inlineViewportRef.value?.zoomIn();
          return;
        }
        inlineViewportRef.value?.zoomOut();
        return;
      }
      dialogScale.value = clampScale(dialogScale.value + delta);
    }

    /**
     * 缩放恢复为 100%
     * @param target 目标窗口
     * @returns {void}
     */
    function resetScale(target: 'inline' | 'dialog'): void {
      if (target === 'inline') {
        inlineViewportRef.value?.resetView();
        return;
      }
      dialogScale.value = 1;
    }

    /**
     * 复制 Mermaid 代码
     * @returns {Promise<void>}
     */
    async function copyCode(): Promise<void> {
      try {
        await navigator.clipboard.writeText(props.code || '');
        codeCopied.value = true;
        window.clearTimeout(codeCopyTimer);
        codeCopyTimer = window.setTimeout(() => {
          codeCopied.value = false;
        }, COPY_RESET_MS);
      } catch {
        ElMessage.error('代码复制失败');
      }
    }

    /**
     * 等待浏览器完成一次绘制，减少截图时机导致的白图
     * @returns {Promise<void>}
     */
    async function waitForPaint(): Promise<void> {
      await nextTick();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }

    /**
     * 将画布转换为 PNG Blob
     * @param canvas 画布
     * @returns {Promise<Blob>}
     */
    async function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('PNG 生成失败'));
            return;
          }
          resolve(blob);
        }, 'image/png');
      });
    }

    /**
     * 下载当前窗口中的 Mermaid 图片（PNG）
     * @param target 目标窗口
     * @returns {Promise<void>}
     */
    async function downloadImage(target: 'inline' | 'dialog'): Promise<void> {
      const root =
        target === 'inline' ? inlineRootRef.value : dialogRootRef.value;
      if (!root) {
        ElMessage.warning('当前没有可下载的图像');
        return;
      }
      try {
        await waitForPaint();
        const canvas = await html2canvas(root, {
          backgroundColor: '#ffffff',
          scale: Math.max(window.devicePixelRatio || 1, 2),
          useCORS: true,
          allowTaint: false,
          logging: false
        });
        const pngBlob = await toPngBlob(canvas);
        const pngUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = 'mermaid-diagram.png';
        link.click();
        URL.revokeObjectURL(pngUrl);
      } catch {
        ElMessage.error('PNG 下载失败');
      }
    }

    /**
     * 复制当前窗口中的 Mermaid 图片
     * @param target 目标窗口
     * @returns {Promise<void>}
     */
    async function copyImage(target: 'inline' | 'dialog'): Promise<void> {
      const root =
        target === 'inline' ? inlineRootRef.value : dialogRootRef.value;
      if (!root) {
        ElMessage.warning('当前没有可复制的图像');
        return;
      }
      try {
        await waitForPaint();
        const canvas = await html2canvas(root, {
          backgroundColor: '#ffffff',
          scale: Math.max(window.devicePixelRatio || 1, 2),
          useCORS: true,
          allowTaint: false,
          logging: false
        });
        const pngBlob = await toPngBlob(canvas);
        if (!navigator.clipboard || !window.ClipboardItem) {
          ElMessage.warning('当前环境不支持图片复制');
          return;
        }
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': pngBlob
          })
        ]);
        if (target === 'inline') {
          inlineCopied.value = true;
          window.clearTimeout(inlineCopyTimer);
          inlineCopyTimer = window.setTimeout(() => {
            inlineCopied.value = false;
          }, COPY_RESET_MS);
          return;
        }
        dialogCopied.value = true;
        window.clearTimeout(dialogCopyTimer);
        dialogCopyTimer = window.setTimeout(() => {
          dialogCopied.value = false;
        }, COPY_RESET_MS);
      } catch {
        ElMessage.error('复制图片失败');
      }
    }

    onBeforeUnmount(() => {
      clearTimers();
    });

    return () => {
      const previewMode = mode.value === 'preview';
      const toolbarActions = previewMode
        ? [
            {
              key: 'zoom-in',
              label: '放大',
              icon: ZoomIn,
              onClick: () => {
                changeScale('inline', SCALE_STEP);
              }
            },
            {
              key: 'zoom-out',
              label: '缩小',
              icon: ZoomOut,
              onClick: () => {
                changeScale('inline', -SCALE_STEP);
              }
            },
            {
              key: 'zoom-reset',
              label: '自适应',
              icon: RefreshRight,
              onClick: () => {
                resetScale('inline');
              }
            },
            {
              key: 'download',
              label: '下载',
              icon: Download,
              onClick: () => {
                void downloadImage('inline');
              }
            },
            {
              key: 'copy-preview',
              label: inlineCopied.value ? '已复制' : '复制',
              icon: CopyDocument,
              onClick: () => {
                void copyImage('inline');
              }
            }
          ]
        : [
            {
              key: 'copy-code',
              label: codeCopied.value ? '已复制' : '复制代码',
              icon: CopyDocument,
              onClick: () => {
                void copyCode();
              }
            }
          ];
      return (
        <div
          style={{
            position: 'relative',
            margin: '12px 0'
          }}
        >
          <div
            style={{
              position: 'relative',
              border: '1px solid #e9e9e9',
              borderRadius: '12px',
              background: '#fafafa',
              padding: '38px 12px 12px 12px',
              minHeight: '220px'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                border: '1px solid #ededed',
                borderRadius: '8px',
                background: '#f4f4f4',
                padding: '2px 6px'
              }}
            >
              {toolbarActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <ElTooltip
                    key={action.key}
                    content={action.label}
                    placement='top'
                  >
                    <ElButton
                      text
                      size='small'
                      onClick={action.onClick}
                      style={{
                        margin: 0,
                        padding: '4px 5px',
                        color: '#707070'
                      }}
                    >
                      <ActionIcon style={{ width: '14px' }} />
                    </ElButton>
                  </ElTooltip>
                );
              })}
              <div
                style={{
                  width: '1px',
                  height: '14px',
                  background: '#d7d7d7',
                  margin: '0 3px'
                }}
              />
              <ElButton
                text
                size='small'
                onClick={() => {
                  mode.value = previewMode ? 'code' : 'preview';
                }}
                style={{
                  margin: 0,
                  padding: '4px 5px',
                  color: '#555555',
                  fontSize: '12px'
                }}
              >
                {previewMode ? '查看代码' : '查看图形'}
              </ElButton>
              <div
                style={{
                  width: '1px',
                  height: '14px',
                  background: '#d7d7d7',
                  margin: '0 3px'
                }}
              />
              <ElButton
                text
                size='small'
                onClick={() => {
                  dialogVisible.value = true;
                }}
                style={{
                  margin: 0,
                  padding: '4px 5px',
                  color: '#555555',
                  fontSize: '12px'
                }}
              >
                <FullScreen style={{ width: '14px', marginRight: '4px' }} />
                展开
              </ElButton>
            </div>

            {previewMode ? (
              <div
                ref={inlineRootRef}
                style={{
                  position: 'relative',
                  height: `${INLINE_PREVIEW_HEIGHT}px`
                }}
              >
                <MermaidCanvasViewport
                  ref={inlineViewportRef}
                  contentKey={props.cacheKey || props.code}
                  watchSources={[props.code, props.streamLoading]}
                  wheelStep={SCALE_STEP}
                  autoFitOnResize={true}
                  preserveUserTransform={true}
                >
                  <MermaidBlock
                    {...props}
                    onRender={() => {
                      void inlineViewportRef.value?.fitToViewport();
                    }}
                  />
                </MermaidCanvasViewport>
              </div>
            ) : (
              <div
                style={{
                  position: 'relative',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  overflow: 'auto',
                  maxHeight: '420px'
                }}
              >
                <CodeHighLight
                  language='mermaid'
                  code={props.code || ''}
                  autoMatch={false}
                />
              </div>
            )}
          </div>
        </div>
      );
    };
  }
});

export default MermaidInteractiveBlock;
