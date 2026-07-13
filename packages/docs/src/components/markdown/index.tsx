import { defineComponent, defineAsyncComponent } from 'vue';
import { CodeBlock } from './codeBlock';
import { tableNodeParse, rehypeMermaid, MergeThinkRemark } from '@nnnb/markdown';
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import ThinkElement, { thinkGroupElementt } from './thinkElement';
import RemarkBreaks from 'remark-breaks';
import RemarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { ElTable, ElTableColumn } from 'element-plus';
import '../../../../components/markdown/markdown.module.scss';

/** Mermaid 卡片较重，按需异步加载 */
const MermaidInteractiveBlock = defineAsyncComponent(
  () => import('./code_mermaid_card')
);

/** 稳定引用，避免每次 render 重建插件/组件配置 */
const remarkPlugins = [
  MergeThinkRemark,
  RemarkBreaks,
  [RemarkGfm, { singleTilde: false }] as const
];

const mathOptions = {
  strict: false,
  rehypeOptions: {},
  remarkOptions: {}
};

const rehypePlugins = [
  [
    rehypeMermaid,
    {
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
  ] as const
];

const markdownComponents = {
  think: ThinkElement,
  thinkGroup: thinkGroupElementt,
  MermaidBlock: MermaidInteractiveBlock,
  custom: (pProps: Record<string, unknown>, { slots }: { slots: { default?: () => unknown } }) => (
    <div {...pProps} class={'markdown-custom'}>
      {slots.default && slots.default()}
    </div>
  ),
  other: (pProps: Record<string, unknown> & { node?: { meta?: { loading?: boolean } } }, { slots }: { slots: { default?: () => unknown } }) => (
    <div {...pProps} class={'markdown-other'}>
      <div>other-loading:{`${pProps?.node?.meta?.loading}`}</div>
      {slots.default && slots.default()}
    </div>
  ),
  table: (pProps: { node: Parameters<typeof tableNodeParse>[0] }) => {
    const { columns, data } = tableNodeParse(pProps.node, {
      type: 'object',
      uuid: true
    });
    return (
      <ElTable data={data}>
        {columns.map((o) => (
          <ElTableColumn key={o} prop={o} label={o} />
        ))}
      </ElTable>
    );
  },
  code: CodeBlock
};

export default defineComponent({
  name: 'VueMarkdown',
  props: {
    source: {
      type: String,
      required: true
    }
  },
  setup(props) {
    return () => (
      <VueMarkdown
        class={'markdown'}
        remarkPlugins={remarkPlugins}
        math={mathOptions}
        components={markdownComponents}
        rehypePlugins={rehypePlugins}
        customElements={['think', 'custom', 'other']}
        source={props.source}
      />
    );
  }
});
