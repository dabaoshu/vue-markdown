import { ref, h, computed, defineComponent, watch, PropType } from 'vue';
import { highlightTohtml, hljsGetLanguage } from './highlight';
import { refractorToHtml } from './refractor';

export const CodeHighLight = defineComponent({
  name: 'HighlighterVue',
  props: {
    generatorType: {
      type: String as PropType<'highlight' | 'refractor'>,
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
    /**generatorType === refractor => enable  */
    theme: {
      type: Object,
      default: () => ({})
    },
    //--------------------------------------------------------
    /* generatorType === highlight => enable */
    ignoreIllegals: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const language = ref(props.language);

    watch(
      () => props.language,
      (newLanguage) => {
        language.value = newLanguage;
      }
    );

    const autodetect = computed(() => props.autoMatch || !language.value);
    const cannotDetectLanguage = computed(
      () => !autodetect.value && !hljsGetLanguage(language.value)
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
        return highlightTohtml(props.code, {
          autoMatch: props.autoMatch,
          language: props.language
        });
      } else {
        return refractorToHtml(props.code, { theme: props.theme });
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
