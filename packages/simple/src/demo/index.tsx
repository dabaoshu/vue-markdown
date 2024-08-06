import { defineComponent, onMounted } from 'vue';
// import styles from './styles/markdown.module.scss';
import { CodeBlock } from './codeBlock';
import { Markdown } from '@nnnb/markdown';
import RemarkMath from 'remark-math';
import RemarkBreaks from 'remark-breaks';
import RehypeKatex from 'rehype-katex';
import RemarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css'

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
        // remarkPlugins={[RemarkGfm, RemarkBreaks, RemarkMath, RemarkToc]}
        // rehypePlugins={[RehypeKatex]}
        remarkPlugins={[RemarkMath, [RemarkGfm, { singleTilde: false }], RemarkBreaks]}
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
