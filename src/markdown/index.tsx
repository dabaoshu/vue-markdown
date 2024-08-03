import { defineComponent, onMounted, ref } from 'vue';
import styles from './components/styles/markdown.module.scss';
import { Markdown } from './components/markdown';
import { CodeBlock } from './codeBlock';

export default defineComponent({
  name: 'Markdown',
  props: {
    source: {
      type: String,
      required: true
    },
    isChatting: {
      type: Boolean,
      required: true
    },
    components: {
      type: Object,
      required: false,
      default: () => ({})
    }
  },
  setup(props) {
    onMounted(() => {
      console.log('Markdown mounted');
    });
    return () => (
      <Markdown
        className={styles.markdown}
        components={{
          pre: (pProps, { slots }) => (
            <div {...pProps} style={{ marginBottom: '0.5rem' }}>
              {slots.default && slots.default()}
            </div>
          ),
          p: (pProps, { slots }) => (
            <p {...pProps} dir='auto'>
              {slots.default && slots.default()}
            </p>
          ),
          code: CodeBlock
        }}
        children={props.source}
      ></Markdown>
    );
  }
});
