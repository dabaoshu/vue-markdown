import { CodeHighLight } from '@nnnb/markdown/vue-ui';
import styles from './index.module.scss';import { defineComponent } from 'vue';

export const CodeBlock = defineComponent({
  name: 'CodeBlock',
  props: {
    class: {
      type: String
    }
  },
  setup(props, { attrs, slots }) {
    return () => {
      const { class: className } = props;
      const { inline, ...props2 } = attrs;
      const language = className ? className.replace('language-', '') : '';
      const match = /language-(\w+)/.exec(className || '');
      const children =
        slots.default &&
        slots.default() &&
        (slots.default()[0].children as string);
      return !inline && match ? (
        <div class={styles['code-block']}>
          <div class={styles['code-block-header']} data-export-ignore>
            <div class={styles['code-language']}>{language}</div>
            <div class={styles['copy-button']}>
              <span>复制</span>
            </div>
          </div>
          
          <CodeHighLight
            language={language}
            code={children}
            autoMatch={false}
          />
        </div>
      ) : (
        <code class={className} {...props2}>
          {children}
        </code>
      );
    };
  }
});
