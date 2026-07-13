import { defineComponent } from 'vue';
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import { CodeBlock } from '@/components/markdown/codeBlock';

/**
 * 测试页专用预览：按用例决定是否挂载 CodeBlock，关闭 math / 其它插件。
 */
export default defineComponent({
  name: 'CodeHighlightPreview',
  props: {
    source: {
      type: String,
      required: true
    },
    /** 是否使用 CodeBlock（CodeHighLight） */
    highlight: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    return () => (
      <VueMarkdown
        class={'markdown'}
        source={props.source}
        components={props.highlight ? { code: CodeBlock } : {}}
        math={null}
      />
    );
  }
});
