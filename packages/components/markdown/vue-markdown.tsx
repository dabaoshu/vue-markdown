import { Fragment, jsx, jsxs } from 'vue-jsx-runtime/jsx-runtime';
import { CreateVMarkdown, MarkdownOptions } from './markdown';
import { PropType, computed, defineComponent } from 'vue';
import { unreachable } from 'devlop';
import { processThink, preprocessMath } from './utils';
import flow from 'lodash/flow';
/**创建vue的markdown */

type VueMarkdownProps2 = {
  /**自定义元素 remarkThink*/
  customElements?: string[];
  /**remark 选项；传 null 表示关闭数学公式 */
  math?: {
    strict?: boolean;
    remarkOptions?: any;
    rehypeOptions?: any;
  } | null;
};
export const VueMarkdownRender = (o) =>
  CreateVMarkdown(o, { Fragment, jsx, jsxs });
export type VueMarkdownProps = Omit<MarkdownOptions, 'children'> &
  VueMarkdownProps2;
const defaultMath = {
  strict: true,
  remarkOptions: {},
  rehypeOptions: {}
};
export const VueMarkdownprops = {
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
  math: {
    type: Object as PropType<VueMarkdownProps['math']>,
    required: false,
    default: () => defaultMath
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
  props: VueMarkdownprops,
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
      const slotChildren =
        (defaultSlot && (defaultSlot?.()[0]?.children as string)) || '';
      if (slotChildren && typeof slotChildren !== 'string') {
        unreachable(
          'Unexpected value `' +
            slotChildren +
            '` for `children` prop, expected `string`'
        );
      }
      return props.source || slotChildren;
    });

    const mergeProps = computed(() => {
      const flows = [];
      const remarkPlugins = [...(props.remarkPlugins || [])];
      const rehypePlugins = [...(props.rehypePlugins || [])];
      const math = props.math;
      if (math) {
        const {
          flow: mathFlow,
          rehypePlugins: mathRehypePlugins,
          remarkPlugins: mathRemarkPlugins
        } = preprocessMath(math.remarkOptions, math.rehypeOptions);
        if (!math.strict) {
          flows.push(mathFlow);
        }
        rehypePlugins.push(mathRehypePlugins);
        remarkPlugins.push(mathRemarkPlugins);
      }

      if (props.customElements?.length) {
        const { remarkPlugins: thinkRemarkPlugins } = processThink({
          tags: props.customElements
        });
        remarkPlugins.push(thinkRemarkPlugins);
      }

      return {
        flows,
        remarkPlugins,
        rehypePlugins
      };
    });

    return () => {
      const { flows, remarkPlugins, rehypePlugins } = mergeProps.value;
      const source = flow(flows)(children.value);
      return (
        <VueMarkdownRender
          className={attrs.class as string}
          components={components.value}
          allowElement={props.allowElement}
          allowedElements={props.allowedElements}
          disallowedElements={props.disallowedElements}
          remarkRehypeOptions={props.remarkRehypeOptions}
          skipHtml={props.skipHtml}
          unwrapDisallowed={props.unwrapDisallowed}
          urlTransform={props.urlTransform}
          customElements={props.customElements}
          math={props.math}
          children={source}
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
        />
      );
    };
  }
});
