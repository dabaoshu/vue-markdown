import {
  defineComponent,
  h,
  inject,
  ref,
  type Component,
  type InjectionKey,
  type PropType
} from 'vue';
import { buildAttachmentPreview } from './attachmentPreviewModel';
import type { AttachmentPreviewModel } from './types';
import './httpResourceMark.scss';

type MarkProps = Record<string, unknown> & {
  href?: string;
  src?: string;
  alt?: string;
  title?: string;
  node?: { properties?: Record<string, unknown> };
};

type MarkSlots = { default?: () => unknown };

/**
 * 场景阅读器打开附件预览的注入键。由 `SceneReader` provide。
 */
export const SCENE_PREVIEW_KEY: InjectionKey<
  (model: AttachmentPreviewModel) => void
> = Symbol('scene-preview');

/**
 * 读取 remarkHttpResource 打在节点上的 data-*。
 *
 * @param props VueMarkdown 下发的标签属性。
 * @param name 如 `data-http-kind`。
 */
function dataAttr(props: MarkProps, name: string): string {
  const fromNode = props.node?.properties?.[name];
  const value = props[name] ?? fromNode;
  return typeof value === 'string' ? value : '';
}

/**
 * 从默认插槽收集纯文本，用作文件预览标题。
 *
 * @param input 插槽渲染结果。
 */
function slotText(input: unknown): string {
  if (input == null || typeof input === 'boolean') {
    return '';
  }
  if (typeof input === 'string' || typeof input === 'number') {
    return String(input);
  }
  if (Array.isArray(input)) {
    return input.map(slotText).join('');
  }
  if (typeof input === 'object' && input !== null && 'children' in input) {
    return slotText((input as { children?: unknown }).children);
  }
  return '';
}

/**
 * 非图片链接的场景组件。无 kind 时由外层原样渲染，不拦截点击。
 *
 * @param props 含 href。
 * @param context.slots 链接文案。
 */
export function SceneBusinessLink(
  props: MarkProps,
  { slots }: { slots: MarkSlots }
) {
  const { node: _node, href, class: className, ...rest } = props;
  return (
    <a {...rest} class={[className, 'scene-business-link']} href={href}>
      {slots.default?.()}
    </a>
  );
}

/**
 * 场景图片：加载成功绿框、失败红框占位。失败时不保留破碎 img。
 * 外层 `withHttpResourceMark` 在失败后点击仍打开 failed 灯箱。
 */
export const SceneBusinessImage = defineComponent({
  name: 'SceneBusinessImage',
  inheritAttrs: false,
  props: {
    src: { type: String, default: '' },
    alt: { type: String, default: '' },
    onFailed: {
      type: Function as PropType<(failed: boolean) => void>,
      default: undefined
    }
  },
  setup(props) {
    const failed = ref(false);
    const ok = ref(false);

    return () =>
      failed.value ? (
        <span
          class='scene-business-image scene-business-image--error'
          role='img'
          aria-label={`${props.alt || '图片'}（加载失败）`}
        >
          加载失败
        </span>
      ) : (
        <img
          class={[
            'scene-business-image',
            ok.value
              ? 'scene-business-image--ok'
              : 'scene-business-image--loading'
          ]}
          src={props.src}
          alt={props.alt || '图片'}
          onError={() => {
            failed.value = true;
            props.onFailed?.(true);
          }}
          onLoad={() => {
            ok.value = true;
            props.onFailed?.(false);
          }}
        />
      );
  }
});

/**
 * 包一层分类徽标。`kind=image` 时渲染可失败的图片组件，其它 kind 走原来的 Inner。
 * 有 kind 时拦截点击并交给 `SCENE_PREVIEW_KEY`；无 kind 不拦截。
 *
 * @param Inner 业务已接入的 `a` / `img` 映射。
 */
export function withHttpResourceMark(
  Inner: Component | ((props: MarkProps, ctx: { slots: MarkSlots }) => unknown)
) {
  return defineComponent({
    name: 'HttpResourceMark',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const openPreview = inject(SCENE_PREVIEW_KEY, null);
      /**
       * 未收到内联图 onLoad 前视为失败。
       * 避免 loading 期间点击 404 时以 failed:false 把死链写入灯箱 src。
       */
      const imageFailed = ref(true);

      /**
       * 已打标资源：阻止跳转并打开预览。
       *
       * @param event 点击事件。
       */
      function onMarkedClick(event: MouseEvent): void {
        const props = attrs as MarkProps;
        const kind = dataAttr(props, 'data-http-kind');
        if (!kind) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (!openPreview) {
          return;
        }

        const href = String(props.href || props.src || '');
        const title =
          kind === 'image'
            ? String(props.alt || '')
            : slotText(slots.default?.()) || href;

        try {
          const model = buildAttachmentPreview({
            kind,
            ext: dataAttr(props, 'data-http-ext'),
            href,
            title,
            imageFailed: kind === 'image' ? imageFailed.value : undefined
          });
          if (model) {
            openPreview(model);
          }
        } catch (error) {
          console.error('[scenes] 打开附件预览失败', error);
        }
      }

      return () => {
        const props = attrs as MarkProps;
        const kind = dataAttr(props, 'data-http-kind');
        const ext = dataAttr(props, 'data-http-ext');
        const inner =
          kind === 'image'
            ? h(SceneBusinessImage, {
                src: String(props.src || props.href || ''),
                alt: String(props.alt || ''),
                onFailed: (failed: boolean) => {
                  imageFailed.value = failed;
                }
              })
            : h(Inner as Component, props, {
                default: () => slots.default?.()
              });

        const label = kind ? (ext ? `${kind}/${ext}` : kind) : '';
        if (!label) {
          return inner;
        }

        return (
          <span class='http-resource-mark' onClick={onMarkedClick}>
            {inner}
            <span class='http-resource-link__badge' aria-hidden='true'>
              {label}
            </span>
          </span>
        );
      };
    }
  });
}

/**
 * 业务场景阅读器注入 `MarkdownRenderer` 的 `a` / `img` 映射。
 */
export const sceneHttpComponents = {
  a: withHttpResourceMark(SceneBusinessLink),
  img: withHttpResourceMark(SceneBusinessImage)
};
