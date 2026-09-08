import { defineComponent, defineAsyncComponent, type PropType } from 'vue';
import { CodeBlock } from './code/codeBlock';
import {
  tableNodeParse,
  rehypeMermaid,
  MergeThinkRemark
} from '@nnnb/markdown';
import { VueMarkdown } from '@nnnb/markdown/vue-ui';
import ThinkElement, { thinkGroupElementt } from './think/thinkElement';
import RemarkBreaks from 'remark-breaks';
import RemarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { ElTable, ElTableColumn } from 'element-plus';
import '@nnnb/markdown/markdown/styles/markdown.scss';
import './index.scss';

export interface MarkdownFeatures {
  gfm: boolean;
  math: boolean;
  breaks: boolean;
  mermaid: boolean;
  think: boolean;
  codeHighlight: boolean;
  customTags: boolean;
  elTable: boolean;
}

export interface MarkdownRendererProps {
  source: string;
  features?: Partial<MarkdownFeatures>;
}

export const DEFAULT_MARKDOWN_FEATURES: MarkdownFeatures = {
  gfm: true,
  math: true,
  breaks: true,
  mermaid: true,
  think: true,
  codeHighlight: true,
  customTags: true,
  elTable: true
};

/** Mermaid 卡片较重，按需异步加载 */
const MermaidInteractiveBlock = defineAsyncComponent(
  () => import('./mermaid/code_mermaid_card')
);

const mathOptions = {
  strict: false,
  rehypeOptions: {},
  remarkOptions: {}
};

const mermaidPluginEntry = [
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
] as const;

/**
 * 根据特性开关组装 remark / rehype 插件与组件映射。
 * @param features 特性配置
 */
function buildMarkdownRenderOptions(features: MarkdownFeatures) {
  const remarkPlugins: unknown[] = [];

  if (features.think) {
    remarkPlugins.push(MergeThinkRemark);
  }
  if (features.breaks) {
    remarkPlugins.push(RemarkBreaks);
  }
  if (features.gfm) {
    remarkPlugins.push([RemarkGfm, { singleTilde: false }]);
  }

  const rehypePlugins: unknown[] = [];
  if (features.mermaid) {
    rehypePlugins.push(mermaidPluginEntry);
  }

  const customElements: string[] = [];
  if (features.think) {
    customElements.push('think');
  }
  if (features.customTags) {
    customElements.push('custom', 'other');
  }

  const components: Record<string, unknown> = {
    pre: (
      pProps: Record<string, unknown>,
      { slots }: { slots: { default?: () => unknown } }
    ) => {
      return (
        <div {...pProps} class={'markdown-pre'}>
          {slots.default && slots.default()}
        </div>
      );
    }
  };

  if (features.think) {
    components.think = ThinkElement;
    components.thinkGroup = thinkGroupElementt;
  }

  if (features.mermaid) {
    components.MermaidBlock = MermaidInteractiveBlock;
  }

  if (features.customTags) {
    components.custom = (
      pProps: Record<string, unknown>,
      { slots }: { slots: { default?: () => unknown } }
    ) => (
      <div {...pProps} class={'markdown-custom'}>
        {slots.default && slots.default()}
      </div>
    );
    components.other = (
      pProps: Record<string, unknown> & {
        node?: { meta?: { loading?: boolean } };
      },
      { slots }: { slots: { default?: () => unknown } }
    ) => (
      <div {...pProps} class={'markdown-other'}>
        <div>other-loading:{`${pProps?.node?.meta?.loading}`}</div>
        {slots.default && slots.default()}
      </div>
    );
  }

  if (features.elTable) {
    components.table = (pProps: {
      node: Parameters<typeof tableNodeParse>[0];
    }) => {
      const { columns, data } = tableNodeParse(pProps.node, {
        type: 'object',
        uuid: true
      });
      return (
        <ElTable data={data as any}>
          {columns.map((o) => (
            <ElTableColumn key={o} prop={o} label={o} />
          ))}
        </ElTable>
      );
    };
  }

  if (features.codeHighlight) {
    components.code = CodeBlock;
  }

  return {
    remarkPlugins,
    rehypePlugins,
    components,
    customElements: customElements.length ? customElements : undefined,
    /** 显式传 null，避免 VueMarkdown 对 undefined 回落到 defaultMath */
    math: features.math ? mathOptions : null
  };
}

export default defineComponent({
  name: 'MarkdownRenderer',
  props: {
    source: {
      type: String,
      required: true
    },
    features: {
      type: Object as PropType<Partial<MarkdownFeatures>>,
      default: () => ({})
    }
  },
  setup(props) {
    return () => {
      const features = { ...DEFAULT_MARKDOWN_FEATURES, ...props.features };
      const options = buildMarkdownRenderOptions(features);
      const renderKey = JSON.stringify(features);

      return (
        <VueMarkdown
          key={renderKey}
          class={'markdown'}
          remarkPlugins={options.remarkPlugins}
          rehypePlugins={options.rehypePlugins}
          components={options.components}
          customElements={options.customElements}
          math={options.math}
          source={props.source}
        />
      );
    };
  }
});
