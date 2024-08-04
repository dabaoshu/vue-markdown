import { CodeHighLight } from '@nnnb/markdown';
// import 'highlight.js/styles/atom-one-dark.css';
// import './styles/codeLight.scss';
import styles from './index.module.scss';
import { defineComponent } from 'vue';
// console.log(dracula);

export const CodeBlock = defineComponent({
  name: 'CodeBlock',
  props: {
    class: {
      type: String
    },
    node: {
      type: Object
    }
  },
  setup(props, { attrs, slots }) {
    return () => {
      const { class: className, node } = props;
      console.log(props);

      const { inline, ...props2 } = attrs;
      const language = className ? className.replace('language-', '') : '';
      const match = /language-(\w+)/.exec(className || '');
      const children =
        slots.default &&
        slots.default() &&
        (slots.default()[0].children as string);
      return !inline && match ? (
        <div class={styles['code-block']}>
          <div class={styles['code-block-header']}>
            <div class={styles['code-language']}>{language}</div>
            <div class={styles['copy-button']}>
              <span
              // copyable={{
              //   tooltips: ['复制', '复制成功'],
              //   text: children
              // }}
              >
                复制
              </span>
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
