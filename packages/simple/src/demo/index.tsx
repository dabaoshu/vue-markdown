import { defineComponent, onMounted } from 'vue';
// import styles from './styles/markdown.module.scss';
import { CodeBlock } from './codeBlock';
import { Markdown } from '@nnnb/markdown';
import RemarkMath from 'remark-math';
import RemarkToc from 'remark-toc';
import RemarkBreaks from 'remark-breaks';
import RehypeKatex from 'rehype-katex';
import RemarkGfm from 'remark-gfm';

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
        // remarkPlugins={[RemarkMath]}
        remarkPlugins={[RemarkGfm, RemarkBreaks, RemarkMath, RemarkToc]}
        rehypePlugins={[RehypeKatex]}
        // class={styles.markdown}
        components={{
          pre: (pProps, { slots }) => (
            <div {...pProps} style={{ marginBottom: '0.5rem' }}>
              {slots.default && slots.default()}
            </div>
          ),
          // p: MyP,
          code: CodeBlock
        }}
        source={props.source}
      ></Markdown>
    );
  }
});
