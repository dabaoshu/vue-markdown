import { defineComponent } from 'vue';
import {
  tableNodeParse,
  rehypeMermaid,
  MergeThinkRemark
} from '@nnnb/markdown';
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import {
  ThinkElement,
  thinkGroupElementt,
  CodeBlock,
  MermaidInteractiveBlock
} from '@nnnb/markdown-ui';
import RemarkBreaks from 'remark-breaks';
import RemarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { ElTable, ElTableColumn } from 'element-plus';
import '@nnnb/markdown/markdown/markdown.module.scss';
import '@nnnb/markdown';
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
      const r = props.source;
      return (
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
            MermaidBlock: MermaidInteractiveBlock,
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
          rehypePlugins={[
            [
              rehypeMermaid,
              {
                // 全局默认官方引擎；块级 engine=beautiful 由 fence meta 覆盖（见 readme）
                engine: 'mermaid',
                mermaidConfig: {
                  theme: 'default',
                  flowchart: { useMaxWidth: true }
                },
                beautifulOptions: {
                  output: 'svg',
                  svg: {
                    transparent: true
                  }
                },
                showLoading: true,
                enableMetaOptions: true,
                injectCacheKey: true,
                fallbackMode: 'keep-code'
              }
            ]
          ]}
          customElements={['think', 'custom', 'other']}
          source={r || props.source}
        ></VueMarkdown>
      );
    };
  }
});
