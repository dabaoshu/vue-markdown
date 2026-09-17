import { defineComponent, type PropType } from 'vue';
import RemarkGfm from 'remark-gfm';
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import {
  remarkHttpResource,
  type HttpResourceOptions
} from '@nnnb/markdown';

/**
 * 测试页专用预览：只接 gfm（可选）+ remarkHttpResource，关闭 math。
 */
export default defineComponent({
  name: 'RemarkHttpResourcePreview',
  props: {
    source: { type: String, required: true },
    gfm: { type: Boolean, default: true },
    plugin: { type: Boolean, default: true },
    options: {
      type: Object as PropType<HttpResourceOptions>,
      default: () => ({})
    }
  },
  setup(props) {
    return () => {
      const remarkPlugins: unknown[] = [];
      if (props.gfm) {
        remarkPlugins.push([RemarkGfm, { singleTilde: false }]);
      }
      if (props.plugin) {
        remarkPlugins.push([remarkHttpResource, props.options]);
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
