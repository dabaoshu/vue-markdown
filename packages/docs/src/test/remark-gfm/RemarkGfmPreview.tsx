import { defineComponent } from 'vue';
import RemarkGfm from 'remark-gfm';
import RemarkBreaks from 'remark-breaks';
import { VueMarkdown } from '@nnnb/markdown/vue-ui';

/**
 * 测试页专用预览：仅按用例开关接线 remark-gfm / remark-breaks，关闭 math。
 */
export default defineComponent({
  name: 'RemarkGfmPreview',
  props: {
    source: {
      type: String,
      required: true
    },
    /** 是否启用 remark-gfm */
    gfm: {
      type: Boolean,
      default: true
    },
    /** 是否启用 remark-breaks */
    breaks: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    return () => {
      const remarkPlugins: unknown[] = [];
      if (props.breaks) {
        remarkPlugins.push(RemarkBreaks);
      }
      if (props.gfm) {
        remarkPlugins.push([RemarkGfm, { singleTilde: false }]);
      }

      return (
        <VueMarkdown
          class={'markdown'}
          source={props.source}
          remarkPlugins={remarkPlugins}
          math={null}
        />
      );
    };
  }
});
