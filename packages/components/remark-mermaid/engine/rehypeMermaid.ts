import type { Root } from 'hast';
import type { RehypeMermaidOptions } from '../core/types';
import {
  createStableHash,
  parseBooleanMetaValue,
  parseFenceMetaToMap,
  parseNumberMetaValue,
  replaceCodeFenceToComponent
} from '../../componentsUtils/engine';

type MermaidMetaOptions = {
  renderSvg?: boolean;
  showLoading?: boolean;
  loadingDelayMs?: number;
  minLoadingMs?: number;
  streamErrorGraceMs?: number;
  streamPendingText?: string;
  className?: string;
  id?: string;
};

/**
 * 解析 Mermaid 代码块 meta 选项
 * @param {string} meta Mermaid fence meta
 * @returns {MermaidMetaOptions} 可识别参数
 */
function parseMermaidMeta(meta: string): MermaidMetaOptions {
  const result: MermaidMetaOptions = {};
  const metaMap = parseFenceMetaToMap(meta);
  for (const [key, rawValue] of Object.entries(metaMap)) {
    switch (key) {
      case 'renderSvg': {
        const value = parseBooleanMetaValue(rawValue);
        if (typeof value === 'boolean') result.renderSvg = value;
        break;
      }
      case 'showLoading': {
        const value = parseBooleanMetaValue(rawValue);
        if (typeof value === 'boolean') result.showLoading = value;
        break;
      }
      case 'loadingDelayMs': {
        const value = parseNumberMetaValue(rawValue);
        if (typeof value === 'number') result.loadingDelayMs = value;
        break;
      }
      case 'minLoadingMs': {
        const value = parseNumberMetaValue(rawValue);
        if (typeof value === 'number') result.minLoadingMs = value;
        break;
      }
      case 'streamErrorGraceMs': {
        const value = parseNumberMetaValue(rawValue);
        if (typeof value === 'number') result.streamErrorGraceMs = value;
        break;
      }
      case 'streamPendingText':
        result.streamPendingText = rawValue;
        break;
      case 'className':
        result.className = rawValue;
        break;
      case 'id':
        result.id = rawValue;
        break;
      default:
        break;
    }
  }
  return result;
}

/**
 * 构建 MermaidBlock 属性
 * @param {string} code Mermaid DSL
 * @param {RehypeMermaidOptions} options 插件配置
 * @param {MermaidMetaOptions} metaOptions 代码块级参数
 * @param {string} cacheKey 预计算缓存键
 * @returns {Record<string, unknown>} MermaidBlock props
 */
function buildMermaidProps(
  code: string,
  options: RehypeMermaidOptions,
  metaOptions: MermaidMetaOptions,
  cacheKey?: string
): Record<string, unknown> {
  const merged = {
    renderSvg: options.renderSvg,
    showLoading: options.showLoading,
    loadingDelayMs: options.loadingDelayMs,
    minLoadingMs: options.minLoadingMs,
    streamErrorGraceMs: options.streamErrorGraceMs,
    streamPendingText: options.streamPendingText,
    ...metaOptions
  };
  return {
    code,
    mermaidConfig: options.mermaidConfig,
    ...merged,
    cacheKey
  };
}

/**
 * 创建 rehype Mermaid 插件
 * @param {RehypeMermaidOptions} options 插件参数
 * @returns {(tree: Root) => void} rehype 转换函数
 */
export function rehypeMermaid(options: RehypeMermaidOptions = {}) {
  return (tree: Root) => {
    replaceCodeFenceToComponent(tree, {
      // lang-mermaid、mermaid、language-mermaid
      languages: ['mermaid', 'lang-mermaid', 'language-mermaid'],
      tagName: 'MermaidBlock',
      /**
       * 判断是否需要将当前代码块替换为 MermaidBlock 组件。
       * 
       * 逻辑说明：
       * - 只有当代码块的 normalizedCode（即经过预处理的 Mermaid 代码内容）不为空时，才进行替换；
       * - 如果 normalizedCode 为空，还需要判断配置的 fallbackMode（回退模式）：
       *   - 默认 fallbackMode 为 'keep-code'，意味着遇到空代码块会保留源码（不替换为组件）；
       *   - 如果 fallbackMode 不是 'keep-code'，即使 normalizedCode 为空也需要替换为组件（通常用于自定义空状态或错误提示）。
       */
      shouldReplace: (context) => {
        const normalizedCode = context.normalizedCode;
        const fallbackMode = options.fallbackMode || 'keep-code';
        return !!normalizedCode || fallbackMode !== 'keep-code';
      },

      buildProperties: (context) => {
        const code = context.rawCode;
        const meta = context.meta;
        const normalizedCode = context.normalizedCode;
        const metaOptions =
          options.enableMetaOptions === false ? {} : parseMermaidMeta(meta);
        const cacheKey =
          options.injectCacheKey === false
            ? undefined
            : createStableHash(
                JSON.stringify({
                  base: context.cacheKey,
                  code,
                  mermaidConfig: options.mermaidConfig,
                  renderOptions: {
                    renderSvg: options.renderSvg,
                    showLoading: options.showLoading,
                    loadingDelayMs: options.loadingDelayMs,
                    minLoadingMs: options.minLoadingMs,
                    streamErrorGraceMs: options.streamErrorGraceMs,
                    streamPendingText: options.streamPendingText,
                    fallbackMode: options.fallbackMode,
                    enableMetaOptions: options.enableMetaOptions
                  },
                  metaOptions,
                  isEmptyCode: !normalizedCode
                })
              );
        return buildMermaidProps(code, options, metaOptions, cacheKey);
      }
    });
  };
}
