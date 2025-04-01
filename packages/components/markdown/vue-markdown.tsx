import { Fragment, jsx, jsxs } from 'vue-jsx-runtime/jsx-runtime';
import { CreateVMarkdown, MarkdownOptions } from './markdown';
import { PropType, computed, defineComponent } from 'vue';
import { unreachable } from 'devlop';
import { remarkThink } from '../remark-think';
/**创建vue的markdown */
const MarkdownRender = (o) => CreateVMarkdown(o, { Fragment, jsx, jsxs });
export type VueMarkdownProps = Omit<MarkdownOptions, 'children'>;

export const Markdownprops = {
  source: {
    type: String,
    required: true
  },
  allowElement: {
    type: Function as PropType<VueMarkdownProps['allowElement']>,
    required: false
  },
  components: {
    type: Object as PropType<VueMarkdownProps['components']>,
    required: false
  },
  customElements: {
    type: Object as PropType<VueMarkdownProps['customElements']>,
    required: false
  },
  allowedElements: {
    type: Array as PropType<VueMarkdownProps['allowedElements']>,
    required: false
  },
  disallowedElements: {
    type: Array as PropType<VueMarkdownProps['disallowedElements']>,
    required: false
  },
  rehypePlugins: {
    type: Array as PropType<VueMarkdownProps['rehypePlugins']>,
    required: false
  },
  remarkPlugins: {
    type: Array as PropType<VueMarkdownProps['remarkPlugins']>,
    required: false
  },
  /**需要具体化选项的类型*/
  remarkRehypeOptions: {
    type: Object as PropType<VueMarkdownProps['remarkRehypeOptions']>,
    required: false
  },
  skipHtml: {
    type: Boolean as PropType<VueMarkdownProps['skipHtml']>,
    required: false
  },
  unwrapDisallowed: {
    type: Boolean as PropType<VueMarkdownProps['unwrapDisallowed']>,
    required: false
  },
  urlTransform: {
    type: Function as PropType<VueMarkdownProps['urlTransform']>,
    required: false
  }
};

export const VueMarkdown = defineComponent({
  name: 'VueMarkdown',
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

    const remarkPlugins = computed(() => {
      const { remarkPlugins: remarkPlugins2, customElements } = props;
      if (customElements) {
        const internalRemarkPlugins = [remarkThink, { tags: customElements }];
        if (Array.isArray(remarkPlugins2)) {
          return remarkPlugins2.concat([internalRemarkPlugins]);
        }
        return [internalRemarkPlugins];
      }
      return remarkPlugins2;
    });

    return () => {
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
