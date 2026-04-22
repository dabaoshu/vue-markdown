import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';

/**
 * 代码块替换上下文
 */
export interface ReplaceCodeFenceContext {
  /** pre 节点 */
  preNode: Element;
  /** code 节点 */
  codeNode: Element;
  /** 原始代码文本 */
  rawCode: string;
  /** 去首尾空白后的代码文本 */
  normalizedCode: string;
  /** 命中的语言 */
  matchedLanguage: string;
  /** fence meta 文本 */
  meta: string;
  /** 稳定 cacheKey */
  cacheKey: string;
}

/**
 * 通用代码块替换参数
 */
export interface ReplaceCodeFenceToComponentOptions {
  /** 需要匹配的语言列表 */
  languages: string[];
  /** 替换后的组件标签名 */
  tagName: string;
  /**
   * 是否执行替换
   * @param {ReplaceCodeFenceContext} context 替换上下文
   * @returns {boolean} 是否替换
   */
  shouldReplace?: (context: ReplaceCodeFenceContext) => boolean;
  /**
   * 构建组件属性
   * @param {ReplaceCodeFenceContext} context 替换上下文
   * @returns {Record<string, unknown>} 组件属性
   */
  buildProperties: (
    context: ReplaceCodeFenceContext
  ) => Record<string, unknown>;
}

/**
 * 代码块 meta 键值映射
 */
export type FenceMetaMap = Record<string, string>;

/**
 * 计算稳定哈希值
 * @param {string} input 输入文本
 * @returns {string} 稳定 hash
 */
export function createStableHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * 提取 code 节点中的纯文本
 * @param {Element} node code 节点
 * @returns {string} 纯文本
 */
export function getCodeNodeText(node: Element): string {
  return (node.children || [])
    .map((child: any) => (child.type === 'text' ? child.value : ''))
    .join('');
}

/**
 * 提取 fence meta 文本
 * @param {Element} node code 节点
 * @returns {string} meta 文本
 */
export function getCodeFenceMeta(node: Element): string {
  const data = (node as any).data;
  const properties = node.properties || {};
  const candidates = [
    data?.meta,
    (properties as any).meta,
    (properties as any).metastring,
    (properties as any).dataMeta,
    (properties as any)['data-meta']
  ];
  for (const item of candidates) {
    if (typeof item === 'string' && item.trim()) return item.trim();
  }
  return '';
}

/**
 * 将字符串解析为布尔值
 * @param {string} value 输入值
 * @returns {boolean | undefined} 解析结果
 */
export function parseBooleanMetaValue(value: string): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

/**
 * 将字符串解析为数字
 * @param {string} value 输入值
 * @returns {number | undefined} 解析结果
 */
export function parseNumberMetaValue(value: string): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

/**
 * 解析 fence meta 为键值映射
 * @param {string} meta fence meta 文本
 * @returns {FenceMetaMap} 解析后的键值
 */
export function parseFenceMetaToMap(meta: string): FenceMetaMap {
  if (!meta.trim()) return {};
  const result: FenceMetaMap = {};
  const tokens = meta.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  for (const token of tokens) {
    const eqIndex = token.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = token.slice(0, eqIndex).trim();
    const rawValue = token
      .slice(eqIndex + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1');
    if (!key) continue;
    result[key] = rawValue;
  }
  return result;
}

/**
 * 提取 code 节点 class token
 * @param {Element} node code 节点
 * @returns {string[]} class tokens
 */
export function getCodeClassTokens(node: Element): string[] {
  const rawClassName = node.properties?.className;
  const tokens = Array.isArray(rawClassName)
    ? rawClassName.map((item) => String(item))
    : typeof rawClassName === 'string'
    ? rawClassName.split(/\s+/)
    : [];
  return tokens.map((token) => token.trim().toLowerCase()).filter(Boolean);
}

/**
 * 匹配代码块语言
 * @param {Element} node code 节点
 * @param {string[]} languages 语言列表
 * @returns {string | undefined} 命中的语言
 */
export function matchCodeFenceLanguage(
  node: Element,
  languages: string[]
): string | undefined {
  if (node.tagName !== 'code') return undefined;
  const classTokens = getCodeClassTokens(node);
  for (const language of languages) {
    const normalized = language.trim().toLowerCase();
    if (classTokens.some((token) => token === normalized)) {
      return normalized;
    }
  }
  return undefined;
}

/**
 * 将指定语言代码块替换为组件节点
 * @param {Root} tree hast 树
 * @param {ReplaceCodeFenceToComponentOptions} options 替换参数
 * @returns {void}
 */
export function replaceCodeFenceToComponent(
  tree: Root,
  options: ReplaceCodeFenceToComponentOptions
): void {
  visit(tree, 'element', (node: Element, index, parent: any) => {
    if (!parent || typeof index !== 'number') return;
    if (node.tagName !== 'pre') return;

    const codeNode = (node.children || []).find(
      (item: any) => item?.type === 'element' && item.tagName === 'code'
    ) as Element | undefined;
    if (!codeNode) return;

    const matchedLanguage = matchCodeFenceLanguage(codeNode, options.languages);
    if (!matchedLanguage) return;

    const rawCode = getCodeNodeText(codeNode);
    const normalizedCode = rawCode.trim();
    const meta = getCodeFenceMeta(codeNode);
    const cacheKey = createStableHash(
      JSON.stringify({
        language: matchedLanguage,
        code: normalizedCode || rawCode,
        meta
      })
    );

    const context: ReplaceCodeFenceContext = {
      preNode: node,
      codeNode,
      rawCode,
      normalizedCode,
      matchedLanguage,
      meta,
      cacheKey
    };

    if (options.shouldReplace && !options.shouldReplace(context)) return;

    parent.children[index] = {
      type: 'element',
      tagName: options.tagName,
      properties: options.buildProperties(context),
      children: []
    };
    (parent.children[index] as any).position = (node as any).position;
    (parent.children[index] as any).data = (node as any).data;
  });
}
