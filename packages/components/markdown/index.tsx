import { PropType, computed, defineComponent } from 'vue';
import { Markdown as MarkdownRender, MarkdownOptions } from './markdown';
import { unreachable } from 'devlop';
import { remarkThink } from '../remark-think';
export * from './utils';
export * from '../remark-think';
export { MarkdownRender };
export type { MarkdownOptions } from './markdown';
export type ExtraProps = {
  openRehypeRaw: boolean;
};
export type MarkdownProps = Omit<MarkdownOptions, 'children'> & ExtraProps;

export const Markdownprops = {
  source: {
    type: String,
    required: true
  },
  allowElement: {
    type: Function as PropType<MarkdownProps['allowElement']>,
    required: false
  },
  components: {
    type: Object as PropType<MarkdownProps['components']>,
    required: false
  },
  customElements: {
    type: Object as PropType<MarkdownProps['customElements']>,
    required: false
  },
  allowedElements: {
    type: Array as PropType<MarkdownProps['allowedElements']>,
    required: false
  },
  disallowedElements: {
    type: Array as PropType<MarkdownProps['disallowedElements']>,
    required: false
  },
  rehypePlugins: {
    type: Array as PropType<MarkdownProps['rehypePlugins']>,
    required: false
  },
  remarkPlugins: {
    type: Array as PropType<MarkdownProps['remarkPlugins']>,
    required: false
  },
  /**需要具体化选项的类型*/
  remarkRehypeOptions: {
    type: Object as PropType<MarkdownProps['remarkRehypeOptions']>,
    required: false
  },
  skipHtml: {
    type: Boolean as PropType<MarkdownProps['skipHtml']>,
    required: false
  },
  unwrapDisallowed: {
    type: Boolean as PropType<MarkdownProps['unwrapDisallowed']>,
    required: false
  },
  urlTransform: {
    type: Function as PropType<MarkdownProps['urlTransform']>,
    required: false
  }
};

export const Markdown = defineComponent({
  name: 'Markdown',
  props: Markdownprops,
  setup(props, { slots, attrs }) {
    const components = computed(() => {
      const { default: defaultSlot, ...otherSlots } = slots;
      const props_components = (props.components || {}) as Object;
      return {
        ...props_components,
        ...otherSlots
      };
    });
    const children = computed(() => {
      const { default: defaultSlot } = slots;
      const children =
        (defaultSlot && (defaultSlot?.()[0]?.children as string)) || '';
      if (typeof children !== 'string') {
        unreachable(
          'Unexpected value `' +
            children +
            '` for `children` prop, expected `string`'
        );
      }
      return props.source || children;
    });
    const { components: props_components, source, ..._props } = props;
    // console.log('mk 源码');

    const remarkPlugins = computed(() => {
      const { remarkPlugins: remarkPlugins2,customElements } = props;
      if (customElements) {
        console.log('customElements', customElements);

        const internalRemarkPlugins = [remarkThink, { tags: customElements }];
        if (Array.isArray(remarkPlugins2)) {
          return remarkPlugins2.concat([internalRemarkPlugins]);
        }
        return [internalRemarkPlugins];
      }
      return remarkPlugins2;
    });

    return () => {
      // const { remarkPlugins } = _props;
      // console.log(remarkPlugins);
      return (
        <MarkdownRender
          className={attrs.class as string}
          components={components.value}
          children={children.value}
          {..._props}
          remarkPlugins={remarkPlugins.value}
        />
      );
    };
  }
});
