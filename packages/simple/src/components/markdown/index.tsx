import { defineComponent } from 'vue';
import { CodeBlock } from './codeBlock';
import { VueMarkdown, tableNodeParse } from '@nnnb/markdown';
import RemarkBreaks from 'remark-breaks';
import RemarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { ElTable, ElTableColumn } from 'element-plus';
import ThinkElement, {
  MergeThinkRemark,
  thinkGroupElementt
} from './thinkElement';
// import '@tntd/react-markdown-mermaid/dist/styles.css'; // 可选：默认样式
import { rehypeMermaid, MermaidBlock } from '@tntd/react-markdown-mermaid';


export default defineComponent({
  name: 'VueMarkdown',
  props: {
    source: {
      type: String,
      required: true
    }
  },
  setup(props) {
    return () => {
      const r = props.source
        // 匹配类似 [^1][^2] 这样的引用，合并为 [1,2](@ref)
        .replace(/(\[\^\d+\])+/g, (t) => {
          const matches = [];
          const regex = /\[\^(\d+)\]/g;
          let match;
          while ((match = regex.exec(t)) !== null) {
            matches.push(match[1]);
          }
          return `[${matches.join(',')}](@ref)`;
        })
        // 匹配类似 [citation:1][citation:2]，合并为 [1,2](@ref)
        .replace(/(\[citation:(\d+)])+/g, (t) => {
          const matches = [];
          const regex = /\[citation:(\d+)]/g;
          let match;
          while ((match = regex.exec(t)) !== null) {
            matches.push(match[1]);
          }
          return `[${matches.join(',')}](@ref)`;
        })
        // 去除以 [c...citation:数字 结尾的内容
        .replace(
          /\[(c|ci|cit|cita|citat|citati|citatio|citation|citation:)\d{0,3}$/,
          ''
        )
        // 修正 (@ref)[$ 结尾的情况
        .replace(/(\(@ref\))\[$/, '$1');

      console.log(r);

      return (
        <>
          {/* <div>{r}</div> */}
          <VueMarkdown
            class={'markdown'}
            remarkPlugins={[
              MergeThinkRemark,
              RemarkBreaks,
              [RemarkGfm, { singleTilde: false }]
            ]}
            math={{
              strict: false,
              rehypeOptions: {},
              remarkOptions: {}
            }}
            components={{
              think: ThinkElement,
              thinkGroup: thinkGroupElementt,
              MermaidBlock,
              custom: (pProps, { slots }) => {
                console.log(
                  '这是custom',
                  pProps
                  // pProps.node,
                  // pProps.node?.meta.loading
                );
                return (
                  <div {...pProps} class={'markdown-custom'}>
                    {slots.default && slots.default()}
                  </div>
                );
              },
              other: (pProps, { slots }) => {
                console.log(
                  '这是other',
                  pProps.node,
                  pProps.node?.meta.loading
                );
                return (
                  <div {...pProps} class={'markdown-other'}>
                    <div>other-loading:{`${pProps?.node.meta.loading}`}</div>

                    {slots.default && slots.default()}
                  </div>
                );
              },
              table: (pProps, { slots }) => {
                const { columns, data } = tableNodeParse(pProps.node, {
                  type: 'object',
                  uuid: true
                });
                return (
                  <ElTable data={data}>
                    {columns.map((o) => (
                      <ElTableColumn prop={o} label={o}></ElTableColumn>
                    ))}
                  </ElTable>
                );
              },
              code: CodeBlock
            }}
            rehypePlugins={[[rehypeMermaid, {
              mermaidConfig: {
                theme: 'base',
                flowchart: { useMaxWidth: true }
              }
            }]]}
            // tags: ['think', 'custom', 'other']
            customElements={['think', 'custom', 'other']}
            source={r || props.source}
          ></VueMarkdown>
        </>
      );
    };
  }
});
