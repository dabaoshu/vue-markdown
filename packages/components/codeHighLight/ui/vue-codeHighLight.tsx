import { computed, defineComponent, PropType } from 'vue';
import { getCodeClassName, highlightTohtml, refractorToHtml } from '../engine';
import type { CodeHighlightGeneratorType } from '../core';
/** 默认 highlight.js 主题（`.hljs-*`），随组件加载 */
import './style';

export const CodeHighLight = defineComponent({
  name: 'HighlighterVue',
  props: {
    generatorType: {
      type: String as PropType<CodeHighlightGeneratorType>,
      default: 'highlight'
    },
    code: {
      type: String,
      required: true
    },
    language: {
      type: String,
      default: ''
    },
    autoMatch: {
      type: Boolean,
      default: true
    },
    /**
     * generatorType === refractor 时启用。
     */
    theme: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({})
    },
    /**
     * generatorType === highlight 时启用。
     */
    ignoreIllegals: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const className = computed(() => {
      return getCodeClassName(props.language, props.autoMatch);
    });

    const highlightedCode = computed(() => {
      if (!props.code) {
        return '';
      }


      if (props.generatorType === 'highlight') {
        return highlightTohtml(props.code, {
          autoMatch: props.autoMatch,
          language: props.language,
          ignoreIllegals: props.ignoreIllegals
        });
      }

      return refractorToHtml(props.code, {
        language: props.language,
        theme: props.theme
      });
    });

    return {
      className,
      highlightedCode
    };
  },
  render() {
    return (
      <pre>
        <code class={this.className} v-html={this.highlightedCode}></code>
      </pre>
    );
  }
});
