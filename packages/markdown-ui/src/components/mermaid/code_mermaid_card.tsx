import {
  CopyDocument,
  Download,
  RefreshRight,
  ZoomIn,
  ZoomOut
} from '@element-plus/icons-vue';
import { ElButton, ElMessage, ElTooltip } from 'element-plus';
import html2canvas from 'html2canvas';
import {
  defineComponent,
  nextTick,
  onBeforeUnmount,
  PropType,
  ref,
  computed,
  watch
} from 'vue';
import {
  MermaidPreviewPane,
  type MermaidPreviewPaneExpose
} from './code_mermaid';

const INLINE_PREVIEW_HEIGHT = 320;
const COPY_RESET_MS = 2000;

/**
 * Mermaid 卡片展示模式
 */
type MermaidCardViewMode = 'code' | 'preview';

/**
 * Mermaid 渲染状态
 */
type MermaidRenderStatus = 'idle' | 'loading' | 'rendered' | 'error';

/** 卡片主题色 */
const COLORS = {
  border: '#e5e7eb',
  bg: '#ffffff',
  bgMuted: '#f9fafb',
  primary: '#3b82f6',
  text: '#111827',
  textMuted: '#9ca3af',
  textSecondary: '#6b7280',
  success: '#10b981',
  successBg: '#ecfdf5',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  error: '#ef4444',
  errorBg: '#fef2f2',
  iconBg: '#8b5cf6'
} as const;

/**
 * 统计代码行数
 * @param code Mermaid 源码
 * @returns {number}
 */
function countLines(code: string): number {
  if (!code) return 0;
  return code.split('\n').length;
}

/**
 * 根据 Mermaid 首行语法推断卡片标题
 * @param code Mermaid 源码
 * @returns {string}
 */
function inferMermaidTitle(code: string): string {
  const firstLine = code.trim().split('\n')[0]?.trim().toLowerCase() ?? '';
  if (firstLine.startsWith('mindmap')) return '思维导图生成';
  if (firstLine.includes('flowchart') || firstLine.startsWith('graph'))
    return '流程图生成';
  if (firstLine.startsWith('sequencediagram')) return '时序图生成';
  if (firstLine.startsWith('classdiagram')) return '类图生成';
  if (firstLine.startsWith('statediagram')) return '状态图生成';
  if (firstLine.startsWith('erdiagram')) return 'ER 图生成';
  if (firstLine.startsWith('gantt')) return '甘特图生成';
  if (firstLine.startsWith('pie')) return '饼图生成';
  if (firstLine.startsWith('journey')) return '用户旅程图生成';
  return '图表生成';
}

/**
 * 思维导图卡片式 Mermaid 组件
 * @description 高保真卡片 UI，作为 Markdown 中 MermaidBlock 的默认交互层
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
    /** 卡片标题；未传时根据 Mermaid 语法自动推断 */
    title: {
      type: String,
      required: false
    },
    beautifulOptions: {
      type: Object,
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
    workerFactory: {
      type: Function as PropType<() => Worker>,
      required: false
    },
    /** 渲染完成后是否允许编辑源码，默认开启 */
    editable: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  emits: ['update:code'],
  setup(props, { emit }) {
    const mode = ref<MermaidCardViewMode>('preview');
    const renderStatus = ref<MermaidRenderStatus>('idle');
    const draftCode = ref(props.code || '');
    const previewPaneRef = ref<MermaidPreviewPaneExpose | null>(null);
    const previewCopied = ref(false);

    let previewCopyTimer = 0;

    watch(
      () => props.code,
      (nextCode) => {
        draftCode.value = nextCode || '';
      }
    );

    const lineCount = computed(() => countLines(draftCode.value));

    const displayTitle = computed(
      () => props.title ?? inferMermaidTitle(draftCode.value)
    );

    /** 首次渲染成功或失败后，且非流式输出中，允许编辑 */
    const isCodeEditable = computed(
      () =>
        props.editable &&
        !props.streamLoading &&
        (renderStatus.value === 'rendered' || renderStatus.value === 'error')
    );

    /**
     * 同步编辑后的 Mermaid 源码
     * @param value 最新源码
     * @returns {void}
     */
    function updateDraftCode(value: string): void {
      draftCode.value = value;
      emit('update:code', value);
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
     * 下载预览图 PNG
     * @returns {Promise<void>}
     */
    async function downloadPreviewImage(): Promise<void> {
      const root = previewPaneRef.value?.getRootElement();
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
     * 复制预览图到剪贴板
     * @returns {Promise<void>}
     */
    async function copyPreviewImage(): Promise<void> {
      const root = previewPaneRef.value?.getRootElement();
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
        previewCopied.value = true;
        window.clearTimeout(previewCopyTimer);
        previewCopyTimer = window.setTimeout(() => {
          previewCopied.value = false;
        }, COPY_RESET_MS);
      } catch {
        ElMessage.error('复制图片失败');
      }
    }

    onBeforeUnmount(() => {
      window.clearTimeout(previewCopyTimer);
    });

    const onRender = () => {
      renderStatus.value = 'rendered';
    };
    /**
     * 根据渲染状态返回徽章文案与配色
     * @returns {object}
     */
    function resolveStatusBadge(): {
      label: string;
      color: string;
      bg: string;
    } {
      if (props.streamLoading) {
        return {
          label: '渲染中',
          color: COLORS.warning,
          bg: COLORS.warningBg
        };
      }
      switch (renderStatus.value) {
        case 'loading':
          return {
            label: '渲染中',
            color: COLORS.warning,
            bg: COLORS.warningBg
          };
        case 'rendered':
          return {
            label: '已渲染',
            color: COLORS.success,
            bg: COLORS.successBg
          };
        case 'error':
          return {
            label: '渲染失败',
            color: COLORS.error,
            bg: COLORS.errorBg
          };
        default:
          return {
            label: '待渲染',
            color: COLORS.textSecondary,
            bg: COLORS.bgMuted
          };
      }
    }

    return () => {
      const badge = resolveStatusBadge();
      const isCodeMode = mode.value === 'code';

      return (
        <div
          style={{
            margin: '12px 0',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            background: COLORS.bg,
            overflow: 'hidden',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}
        >
          {/* 标题栏 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: `1px solid ${COLORS.border}`
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: COLORS.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <circle cx='12' cy='5' r='2' fill='#ffffff' />
                  <circle cx='6' cy='14' r='2' fill='#ffffff' />
                  <circle cx='18' cy='14' r='2' fill='#ffffff' />
                  <circle cx='12' cy='19' r='2' fill='#ffffff' />
                  <line
                    x1='12'
                    y1='7'
                    x2='6'
                    y2='12'
                    stroke='#ffffff'
                    stroke-width='1.5'
                  />
                  <line
                    x1='12'
                    y1='7'
                    x2='18'
                    y2='12'
                    stroke='#ffffff'
                    stroke-width='1.5'
                  />
                  <line
                    x1='6'
                    y1='16'
                    x2='12'
                    y2='17'
                    stroke='#ffffff'
                    stroke-width='1.5'
                  />
                  <line
                    x1='18'
                    y1='16'
                    x2='12'
                    y2='17'
                    stroke='#ffffff'
                    stroke-width='1.5'
                  />
                </svg>
              </div>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: COLORS.text,
                  lineHeight: 1.4
                }}
              >
                {displayTitle.value}
              </span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '999px',
                background: badge.bg,
                fontSize: '13px',
                color: badge.color,
                fontWeight: 500,
                flexShrink: 0
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: badge.color,
                  flexShrink: 0
                }}
              />
              {badge.label}
            </div>
          </div>

          {/* Tab 切换 */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 16px 0',
              borderBottom: `1px solid ${COLORS.border}`
            }}
          >
            {(
              [
                { key: 'code' as const, label: 'Mermaid 语法' },
                { key: 'preview' as const, label: '渲染效果' }
              ] as const
            ).map((tab) => {
              const active = mode.value === tab.key;
              return (
                <button
                  key={tab.key}
                  type='button'
                  onClick={() => {
                    mode.value = tab.key;
                  }}
                  style={{
                    margin: 0,
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${
                      active ? COLORS.primary : COLORS.border
                    }`,
                    background: COLORS.bg,
                    color: active ? COLORS.primary : COLORS.textMuted,
                    fontSize: '13px',
                    fontWeight: active ? 500 : 400,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'color 0.15s, border-color 0.15s'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 内容区 */}
          <div style={{ padding: '12px 16px 16px' }}>
            {isCodeMode ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: COLORS.text
                    }}
                  >
                    Mermaid 语法
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: COLORS.textMuted
                    }}
                  >
                    {lineCount.value} 行
                    {isCodeEditable.value ? ' · 可编辑' : ''}
                  </span>
                </div>
                <div
                  style={{
                    background: COLORS.bgMuted,
                    borderRadius: '6px',
                    border: `1px solid ${COLORS.border}`,
                    overflow: 'auto',
                    maxHeight: '420px'
                  }}
                >
                  {isCodeEditable.value ? (
                    <textarea
                      value={draftCode.value}
                      onInput={(event) => {
                        updateDraftCode(
                          (event.target as HTMLTextAreaElement).value
                        );
                      }}
                      spellcheck={false}
                      style={{
                        display: 'block',
                        width: '100%',
                        minHeight: '240px',
                        margin: 0,
                        padding: '14px 16px',
                        border: 'none',
                        outline: 'none',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        background: 'transparent',
                        fontFamily:
                          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                        fontSize: '13px',
                        lineHeight: 1.65,
                        color: COLORS.text,
                        tabSize: 2
                      }}
                    />
                  ) : (
                    <pre
                      style={{
                        margin: 0,
                        padding: '14px 16px',
                        fontFamily:
                          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                        fontSize: '13px',
                        lineHeight: 1.65,
                        color: COLORS.text,
                        whiteSpace: 'pre',
                        tabSize: 2
                      }}
                    >
                      {draftCode.value}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: COLORS.text
                  }}
                >
                  渲染效果
                </span>
              </div>
            )}

            {/* 预览区：工具栏通过 expose 控制缩放，画布结构在 code_mermaid */}
            <div
              style={{
                display: isCodeMode ? 'none' : 'block',
                position: 'relative',
                height: `${INLINE_PREVIEW_HEIGHT}px`,
                background: COLORS.bgMuted,
                borderRadius: '6px',
                border: `1px solid ${COLORS.border}`,
                overflow: 'hidden'
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
                {[
                  {
                    key: 'zoom-in',
                    label: '放大',
                    icon: ZoomIn,
                    onClick: () => previewPaneRef.value?.zoomIn()
                  },
                  {
                    key: 'zoom-out',
                    label: '缩小',
                    icon: ZoomOut,
                    onClick: () => previewPaneRef.value?.zoomOut()
                  },
                  {
                    key: 'zoom-reset',
                    label: '自适应',
                    icon: RefreshRight,
                    onClick: () => previewPaneRef.value?.resetView()
                  },
                  {
                    key: 'download',
                    label: '下载',
                    icon: Download,
                    onClick: () => {
                      void downloadPreviewImage();
                    }
                  },
                  {
                    key: 'copy-preview',
                    label: previewCopied.value ? '已复制' : '复制',
                    icon: CopyDocument,
                    onClick: () => {
                      void copyPreviewImage();
                    }
                  }
                ].map((action) => {
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
              </div>

              <MermaidPreviewPane
                ref={previewPaneRef}
                code={draftCode.value}
                cacheKey={props.cacheKey}
                beautifulOptions={props.beautifulOptions}
                mermaidConfig={props.mermaidConfig}
                renderSvg={props.renderSvg}
                className={props.className}
                streamLoading={props.streamLoading}
                loadingText={'正在加载'}
                errorText={'渲染失败'}
                streamPendingText={'正在加载'}
                loadingDelayMs={props.loadingDelayMs}
                minLoadingMs={props.minLoadingMs}
                onRender={onRender}
                onError={(error: Error) => {
                  console.log('error', error);
                  renderStatus.value = 'error';
                }}
              />
            </div>
          </div>
        </div>
      );
    };
  }
});

/** @deprecated 请使用 MermaidInteractiveBlock */
export const MermaidCardBlock = MermaidInteractiveBlock;

export default MermaidInteractiveBlock;
