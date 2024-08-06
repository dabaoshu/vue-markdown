import { PropType, computed, defineComponent } from 'vue';
import { Markdown as MarkdownRender, MarkdownOptions } from './markdown';
import { unreachable } from 'devlop';
import RemarkMath from 'remark-math';
import RemarkToc from 'remark-toc';
import RemarkBreaks from 'remark-breaks';
import RehypeKatex from 'rehype-katex';
import RemarkGfm from 'remark-gfm';
export { MarkdownRender };
export type { MarkdownOptions } from './markdown';
export type MarkdownProps = Omit<MarkdownOptions, 'children'>;
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

    return () => {
      console.log(_props);
      console.log(_props.remarkPlugins);
      
      return (
        <MarkdownRender
          className={attrs.class as string}
          components={components.value}
          children={children.value}
          // remarkPlugins={props.remarkPlugins}
          // rehypePlugins={props.rehypePlugins}
          // remarkPlugins={[RemarkGfm, RemarkBreaks, RemarkMath, RemarkToc]}
          // rehypePlugins={[RehypeKatex]}
          {..._props}
        />
      );
    };
  }
});
