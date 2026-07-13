import { defineComponent } from 'vue';
import { rehypeMermaid } from '@nnnb/markdown';
import { MermaidBlock, VueMarkdown } from '@nnnb/markdown/vue-ui';

/**
 * 测试页专用预览：按用例开关接线 rehypeMermaid + MermaidBlock（不用 Demo 卡片）。
 */
export default defineComponent({
  name: 'RehypeMermaidPreview',
  props: {
    source: {
      type: String,
      required: true
    },
    /** 是否启用 Mermaid 插件与组件 */
    mermaidEnabled: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    return () => {
      const rehypePlugins = props.mermaidEnabled
        ? [
            [
              rehypeMermaid,
              {
                engine: 'mermaid',
                showLoading: false,
                enableMetaOptions: true,
                fallbackMode: 'keep-code'
              }
            ]
          ]
        : [];

      const components = props.mermaidEnabled
        ? { MermaidBlock }
        : {};

      return (
        <VueMarkdown
          class={'markdown'}
          source={props.source}
          rehypePlugins={rehypePlugins}
          components={components}
          math={null}
        />
      );
    };
  }
});
