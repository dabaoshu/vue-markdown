import type {
  BeautifulMermaidOptions,
  MermaidRenderEngine,
  RehypeMermaidOptions
} from '../core/types';
import type { Root } from 'hast';
import {
  createStableHash,
  parseBooleanMetaValue,
  parseFenceMetaToMap,
  parseNumberMetaValue,
  replaceCodeFenceToComponent
} from '../../componentsUtils/engine';

type MermaidMetaOptions = {
  engine?: MermaidRenderEngine;
  renderSvg?: boolean;
  showLoading?: boolean;
  loadingDelayMs?: number;
  minLoadingMs?: number;
  streamErrorGraceMs?: number;
  streamPendingText?: string;
  className?: string;
  id?: string;
  beautifulOptions?: BeautifulMermaidOptions;
};

function ensureBeautifulOptions(
  target: MermaidMetaOptions
): NonNullable<MermaidMetaOptions['beautifulOptions']> {
  if (!target.beautifulOptions) {
    target.beautifulOptions = {};
  }
  return target.beautifulOptions;
}

function ensureBeautifulSvgOptions(
  target: MermaidMetaOptions
): NonNullable<NonNullable<MermaidMetaOptions['beautifulOptions']>['svg']> {
  const beautifulOptions = ensureBeautifulOptions(target);
  if (!beautifulOptions.svg) {
    beautifulOptions.svg = {};
  }
  return beautifulOptions.svg;
}

function ensureBeautifulAsciiOptions(
  target: MermaidMetaOptions
): NonNullable<NonNullable<MermaidMetaOptions['beautifulOptions']>['ascii']> {
  const beautifulOptions = ensureBeautifulOptions(target);
  if (!beautifulOptions.ascii) {
    beautifulOptions.ascii = {};
  }
  return beautifulOptions.ascii;
}

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
      case 'engine':
        if (rawValue === 'mermaid' || rawValue === 'beautiful') {
          result.engine = rawValue;
        }
        break;
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
      case 'output':
        if (rawValue === 'svg' || rawValue === 'ascii') {
          ensureBeautifulOptions(result).output = rawValue;
        }
        break;
      case 'theme':
        ensureBeautifulSvgOptions(result).theme = rawValue;
        break;
      case 'bg':
      case 'fg':
      case 'line':
      case 'accent':
      case 'muted':
      case 'surface':
      case 'border':
      case 'font':
        ensureBeautifulSvgOptions(result)[key] = rawValue;
        break;
      case 'padding':
      case 'nodeSpacing':
      case 'layerSpacing':
      case 'componentSpacing': {
        const value = parseNumberMetaValue(rawValue);
        if (typeof value === 'number') {
          ensureBeautifulSvgOptions(result)[key] = value;
        }
        break;
      }
      case 'transparent':
      case 'interactive': {
        const value = parseBooleanMetaValue(rawValue);
        if (typeof value === 'boolean') {
          ensureBeautifulSvgOptions(result)[key] = value;
        }
        break;
      }
      case 'useAscii': {
        const value = parseBooleanMetaValue(rawValue);
        if (typeof value === 'boolean') {
          ensureBeautifulAsciiOptions(result).useAscii = value;
        }
        break;
      }
      case 'paddingX':
      case 'paddingY':
      case 'boxBorderPadding': {
        const value = parseNumberMetaValue(rawValue);
        if (typeof value === 'number') {
          ensureBeautifulAsciiOptions(result)[key] = value;
        }
        break;
      }
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

function mergeBeautifulOptions(
  base?: BeautifulMermaidOptions,
  override?: BeautifulMermaidOptions
): BeautifulMermaidOptions | undefined {
  if (!base && !override) return undefined;
  return {
    ...(base || {}),
    ...(override || {}),
    svg: {
      ...(base?.svg || {}),
      ...(override?.svg || {})
    },
    ascii: {
      ...(base?.ascii || {}),
      ...(override?.ascii || {})
    }
  };
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
    engine: options.engine,
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
    engine: merged.engine || 'mermaid',
    mermaidConfig: options.mermaidConfig,
    beautifulOptions: mergeBeautifulOptions(
      options.beautifulOptions,
      metaOptions.beautifulOptions
    ),
    renderSvg: merged.renderSvg,
    showLoading: merged.showLoading,
    loadingDelayMs: merged.loadingDelayMs,
    minLoadingMs: merged.minLoadingMs,
    streamErrorGraceMs: merged.streamErrorGraceMs,
    streamPendingText: merged.streamPendingText,
    className: merged.className,
    id: merged.id,
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
      languages: ['mermaid', 'lang-mermaid', 'language-mermaid'],
      tagName: 'MermaidBlock',
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
                  engine: options.engine || 'mermaid',
                  mermaidConfig: options.mermaidConfig,
                  beautifulOptions: mergeBeautifulOptions(
                    options.beautifulOptions,
                    metaOptions.beautifulOptions
                  ),
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
