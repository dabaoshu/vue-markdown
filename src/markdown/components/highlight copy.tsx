import {
  ref,
  h,
  computed,
  defineComponent,
  Plugin,
  watch,
  PropType
} from 'vue';
import hljs from 'highlight.js';
import { refractor } from 'refractor';
import { toHtml } from 'hast-util-to-html';
import { visit } from 'unist-util-visit';
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const getThemeStyle = () => {
  return '';
};

export const HighlighterVue = defineComponent({
  name: 'HighlighterVue',
  props: {
    generatorType: {
      type: String as PropType<'highlight' | 'refractor'>,
      default: 'refractor'
    },
    theme: {
      type: Object,
      default: () => ({})
    },
    code: {
      type: String,
      required: true
    },
    language: {
      type: String,
      default: ''
    },
    autodetect: {
      type: Boolean,
      default: true
    },
    ignoreIllegals: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const language = ref(props.language);
    const theme = props.theme;
    // const themeTokenKeys=
    const transform = (node, index, parent) => {
      if (node.type === 'element') {
        node.properties.className.includes();
      }
    };
    watch(
      () => props.language,
      (newLanguage) => {
        language.value = newLanguage;
      }
    );

    const autodetect = computed(() => props.autodetect || !language.value);
    const cannotDetectLanguage = computed(
      () => !autodetect.value && !hljs.getLanguage(language.value)
    );

    const className = computed((): string => {
      if (cannotDetectLanguage.value) {
        return '';
      } else {
        return `hljs ${language.value}`;
      }
    });

    const highlightedCode = computed((): string => {
      if (props.generatorType === 'highlight') {
        // No idea what language to use, return raw code
        if (cannotDetectLanguage.value) {
          console.warn(
            `The language "${language.value}" you specified could not be found.`
          );
          return escapeHtml(props.code);
        }
        if (autodetect.value) {
          const result = hljs.highlightAuto(props.code);
          language.value = result.language ?? '';
          return result.value;
        } else {
          const result = hljs.highlight(props.code, {
            language: language.value,
            ignoreIllegals: props.ignoreIllegals
          });
          return result.value;
        }
      } else {
        const tree = refractor.highlight(props.code, language.value);
        console.log('tree', tree);
        visit(tree, transform);
        return toHtml(tree, {});
      }
    });

    return {
      className,
      highlightedCode
    };
  },
  render() {
    return h('pre', {}, [
      h('code', {
        class: this.className,
        innerHTML: this.highlightedCode
      })
    ]);
  }
});

export const plugin: Plugin & { component: typeof HighlighterVue } = {
  install(app) {
    app.component('HighlighterVue', HighlighterVue);
  },
  component: HighlighterVue
};
