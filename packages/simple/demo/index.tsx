import { defineComponent, onMounted } from 'vue';
// import styles from './styles/markdown.module.scss';
import { CodeBlock } from './codeBlock';
import { Markdown } from '@nnnb/markdown';
const MyP = (pProps, { slots }) => (
  <p {...pProps} dir='auto'>
    {slots.default && slots.default()}
  </p>
);
const MyP2 = (pProps) => (
  <p {...pProps} dir='auto'>
    MyP2MyP2MyP2
  </p>
);

export default defineComponent({
  name: 'demo',
  props: {
    source: {
      type: String,
      required: true
    }
  },
  setup(props) {
    onMounted(() => {
      console.log('demo mounted');
    });
    return () => (
      <Markdown
        // class={styles.markdown}
        components={{
          pre: (pProps, { slots }) => (
            <div {...pProps} style={{ marginBottom: '0.5rem' }}>
              {slots.default && slots.default()}
            </div>
          ),
          p: MyP,
          code: CodeBlock
        }}
        source={props.source}
      >
        {{
          default: ' props.source',
          p: MyP2
        }}
      </Markdown>
    );
  }
});
