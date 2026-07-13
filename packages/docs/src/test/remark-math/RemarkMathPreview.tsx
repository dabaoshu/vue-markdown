import { defineComponent } from 'vue';
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import 'katex/dist/katex.min.css';

const mathOptions = {
  strict: false,
  rehypeOptions: {},
  remarkOptions: {}
};

/**
 * 测试页专用预览：仅按用例开关 math，与 Demo 一致 strict:false。
 */
export default defineComponent({
  name: 'RemarkMathPreview',
  props: {
    source: {
      type: String,
      required: true
    },
    /** 是否启用数学公式管线 */
    mathEnabled: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    return () => (
      <VueMarkdown
        class={'markdown'}
        source={props.source}
        math={props.mathEnabled ? mathOptions : null}
      />
    );
  }
});
