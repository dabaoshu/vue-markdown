import { defineComponent, h, ref, type Component } from 'vue';
import './httpResourceLink.scss';

type MarkProps = Record<string, unknown> & {
  href?: string;
  src?: string;
  alt?: string;
  node?: { properties?: Record<string, unknown> };
};

type MarkSlots = { default?: () => unknown };

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
 * 包一层分类徽标。`kind=image` 时渲染可失败的图片组件，其它 kind 走原来的 Inner。
 *
 * @param Inner 业务已接入的 `a` 映射（如链接卡片）。
 */
export function withHttpResourceMark(
  Inner: Component | ((props: MarkProps, ctx: { slots: MarkSlots }) => unknown)
) {
  return (props: MarkProps, { slots }: { slots: MarkSlots }) => {
    const kind = dataAttr(props, 'data-http-kind');
    const ext = dataAttr(props, 'data-http-ext');
    const inner =
      kind === 'image'
        ? h(DemoBusinessImage, {
            src: String(props.src || props.href || ''),
            alt: String(props.alt || '')
          })
        : h(Inner as Component, props, { default: () => slots.default?.() });

    const label = kind ? (ext ? `${kind}/${ext}` : kind) : '';
    if (!label) return inner;
    return (
      <span class='http-resource-mark'>
        {inner}
        <span class='http-resource-link__badge' aria-hidden='true'>
          {label}
        </span>
      </span>
    );
  };
}

/**
 * 非图片链接的演示组件。
 *
 * @param props 含 href。
 * @param context.slots 链接文案。
 */
export function DemoBusinessLink(
  props: MarkProps,
  { slots }: { slots: MarkSlots }
) {
  const { node: _node, href, class: className, ...rest } = props;
  return (
    <a {...rest} class={[className]} href={href}>
      {slots.default?.()}
    </a>
  );
}

/**
 * 图片演示组件：加载失败时显示红框占位。
 */
export const DemoBusinessImage = defineComponent({
  name: 'DemoBusinessImage',
  props: {
    src: { type: String, default: '' },
    alt: { type: String, default: '' }
  },
  setup(props) {
    const failed = ref(false);
    const ok = ref(false);
    return () =>
      failed.value ? (
        <span
          class='demo-business-image demo-business-image--error'
          role='img'
          aria-label={`${props.alt || '图片'}（加载失败）`}
        >
          加载失败
        </span>
      ) : (
        <img
          class={[
            'demo-business-image',
            ok.value
              ? 'demo-business-image--ok'
              : 'demo-business-image--loading'
          ]}
          src={props.src}
          alt={props.alt || '图片'}
          onError={() => {
            failed.value = true;
          }}
          onLoad={() => {
            ok.value = true;
          }}
        />
      );
  }
});
