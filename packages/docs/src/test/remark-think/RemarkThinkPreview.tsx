import { defineComponent, type PropType } from 'vue';
import { MergeThinkRemark } from '@nnnb/markdown';
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import ThinkElement, { thinkGroupElementt } from '@/components/markdown/thinkElement';

/**
 * 测试页专用预览：按用例 tags / merge 精确接线，避免 Demo 默认特性干扰断言。
 */
export default defineComponent({
  name: 'RemarkThinkPreview',
  props: {
    source: {
      type: String,
      required: true
    },
    tags: {
      type: Array as PropType<string[]>,
      default: () => ['think']
    },
    merge: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    return () => {
      const tags = props.tags.length ? props.tags : ['think'];
      const components: Record<string, unknown> = {
        think: ThinkElement,
        thinkGroup: thinkGroupElementt,
        custom: (
          pProps: Record<string, unknown>,
          { slots }: { slots: { default?: () => unknown } }
        ) => (
          <div {...pProps} class={'markdown-custom'}>
            {slots.default && slots.default()}
          </div>
        ),
        other: (
          pProps: Record<string, unknown>,
          { slots }: { slots: { default?: () => unknown } }
        ) => (
          <div {...pProps} class={'markdown-other'}>
            {slots.default && slots.default()}
          </div>
        )
      };

      return (
        <VueMarkdown
          class={'markdown'}
          source={props.source}
          customElements={tags}
          remarkPlugins={props.merge ? [MergeThinkRemark] : []}
          components={components}
          math={null}
        />
      );
    };
  }
});
