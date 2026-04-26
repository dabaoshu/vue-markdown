/**
 * 由 JSON 描述生成 Mermaid 源码（引擎层，无框架依赖）
 * @description 当前实现 `flowchart`；其余类型可后续扩展
 */

/** 支持的图表大类 */
export type MermaidJsonType =
  | 'flowchart'
  | 'sequence'
  | 'class'
  | 'state'
  | 'er'
  | 'gantt'
  | 'pie';

/** 流程图节点形状（与 Mermaid flowchart 语法对应） */
export type FlowchartNodeShape =
  | 'rect'
  | 'round'
  | 'stadium'
  | 'subroutine'
  | 'cylinder'
  | 'circle'
  /** 菱形（`{}`） */
  | 'rhombus'
  /** 菱形（`{}`），与 `rhombus` 同义 */
  | 'diamond'
  | 'hexagon'
  | 'parallelogram'
  | 'trapezoid'
  | 'trapezoid_alt';

/** 流程图节点 */
export interface FlowchartJsonNode {
  /** 节点 id（建议字母数字下划线） */
  id: string;
  /** 展示文案 */
  label: string;
  /** 形状，默认 `rect` */
  shape?: FlowchartNodeShape;
}

/** 流程图边 */
export interface FlowchartJsonEdge {
  from: string;
  to: string;
  /** 边上的文字，对应 `-->|label|` */
  label?: string;
}

/** `type: 'flowchart'` 时的 `data` 结构 */
export interface FlowchartJsonData {
  nodes: FlowchartJsonNode[];
  edges: FlowchartJsonEdge[];
}

/** 流程图方向 */
export type FlowchartDirection = 'TB' | 'LR' | 'BT' | 'RL';

/** 入口参数：流程图分支 */
export interface JsonToMermaidFlowchartOptions {
  type: 'flowchart';
  data: FlowchartJsonData;
  direction?: FlowchartDirection;
  /** 预留：主题等 Mermaid 初始化参数（当前未写入输出） */
  config?: Record<string, unknown>;
}

/** 未实现类型的占位（便于联合类型扩展） */
export type JsonToMermaidOtherOptions = {
  type: Exclude<MermaidJsonType, 'flowchart'>;
  data: unknown;
  direction?: FlowchartDirection;
  config?: Record<string, unknown>;
};

export type JsonToMermaidOptions = JsonToMermaidFlowchartOptions | JsonToMermaidOtherOptions;

/** Mermaid 逆向解析结果（当前仅 flowchart） */
export type MermaidToJsonResult = JsonToMermaidFlowchartOptions;

/**
 * 判断字符在 flowchart 节点文案中是否需要引号包裹
 * @param label 原始文案
 */
function flowchartLabelNeedsQuotes(label: string): boolean {
  if (!label) return false;
  return /[\s[\](){}|"'`#]/.test(label);
}

/**
 * 将节点文案格式化为可嵌入 Mermaid 节点语法的片段
 * @param label 原始文案
 */
function formatFlowchartLabelText(label: string): string {
  if (flowchartLabelNeedsQuotes(label)) {
    return `"${label.replace(/"/g, '\\"')}"`;
  }
  return label;
}

/**
 * 根据形状输出 `id + 形状包裹` 的左侧定义（不含边）
 * @param id 节点 id
 * @param label 展示文案
 * @param shape 形状
 */
function flowchartNodeDefinition(id: string, label: string, shape: FlowchartNodeShape = 'rect'): string {
  const t = formatFlowchartLabelText(label);
  switch (shape) {
    case 'rect':
      return `${id}[${t}]`;
    case 'round':
      return `${id}(${t})`;
    case 'stadium':
      return `${id}([${t}])`;
    case 'subroutine':
      return `${id}[[${t}]]`;
    case 'cylinder':
      return `${id}[(${t})]`;
    case 'circle':
      return `${id}((${t}))`;
    case 'rhombus':
    case 'diamond':
      return `${id}{${t}}`;
    case 'hexagon':
      return `${id}{{${t}}}`;
    case 'parallelogram':
      return `${id}[/${t}/]`;
    case 'trapezoid':
      return `${id}[/${t}\\]`;
    case 'trapezoid_alt':
      return `${id}[\\${t}/]`;
    default:
      return `${id}[${t}]`;
  }
}

/**
 * 校验 id 仅含安全字符，避免注入换行等破坏 DSL
 * @param id 节点 id
 */
function assertSafeMermaidId(id: string, context: string): void {
  if (!/^[A-Za-z0-9_]+$/.test(id)) {
    throw new Error(`jsonToMermaid: ${context} 非法 id "${id}"，仅允许字母、数字、下划线`);
  }
}

/**
 * 将 flowchart JSON 转为 Mermaid 文本
 * @param options 仅使用 flowchart 相关字段
 */
function flowchartJsonToMermaid(options: JsonToMermaidFlowchartOptions): string {
  const dir = options.direction ?? 'TB';
  const { nodes, edges } = options.data;
  const lines: string[] = [`flowchart ${dir}`];

  const idSet = new Set<string>();
  for (const n of nodes) {
    assertSafeMermaidId(n.id, '节点');
    if (idSet.has(n.id)) {
      throw new Error(`jsonToMermaid: 重复的节点 id "${n.id}"`);
    }
    idSet.add(n.id);
    const def = flowchartNodeDefinition(n.id, n.label ?? '', n.shape);
    lines.push(`  ${def}`);
  }

  for (const e of edges) {
    assertSafeMermaidId(e.from, '边 from');
    assertSafeMermaidId(e.to, '边 to');
    if (!idSet.has(e.from) || !idSet.has(e.to)) {
      throw new Error(
        `jsonToMermaid: 边 ${e.from} -> ${e.to} 引用了未在 nodes 中声明的 id`,
      );
    }
    const mid = e.label != null && e.label !== ''
      ? `-->|${formatFlowchartLabelText(e.label)}|`
      : '-->';
    lines.push(`  ${e.from} ${mid} ${e.to}`);
  }

  return lines.join('\n');
}

/**
 * 去除 Mermaid label 的外层双引号并反转义
 * @param label 原始标签文本
 */
function parseFlowchartLabel(label: string): string {
  const trimmed = label.trim();
  const matched = trimmed.match(/^"([\s\S]*)"$/);
  if (!matched) return trimmed;
  return matched[1].replace(/\\"/g, '"');
}

/**
 * 从带形状的节点 token 中提取节点信息
 * @param token 如 `A((开始))`、`B[处理]`、`C`
 */
function parseFlowchartNodeToken(token: string): FlowchartJsonNode {
  const trimmed = token.trim();
  const capture = (reg: RegExp, shape: FlowchartNodeShape): FlowchartJsonNode | null => {
    const hit = trimmed.match(reg);
    if (!hit) return null;
    return {
      id: hit[1],
      label: parseFlowchartLabel(hit[2]),
      shape,
    };
  };

  const byShape =
    capture(/^([A-Za-z0-9_]+)\(\(([\s\S]*)\)\)$/, 'circle') ??
    capture(/^([A-Za-z0-9_]+)\[\(([\s\S]*)\)\]$/, 'cylinder') ??
    capture(/^([A-Za-z0-9_]+)\(\[([\s\S]*)\]\)$/, 'stadium') ??
    capture(/^([A-Za-z0-9_]+)\[\[([\s\S]*)\]\]$/, 'subroutine') ??
    capture(/^([A-Za-z0-9_]+)\{\{([\s\S]*)\}\}$/, 'hexagon') ??
    capture(/^([A-Za-z0-9_]+)\{([\s\S]*)\}$/, 'rhombus') ??
    capture(/^([A-Za-z0-9_]+)\[\/([\s\S]*)\\\]$/, 'trapezoid') ??
    capture(/^([A-Za-z0-9_]+)\[\\([\s\S]*)\/\]$/, 'trapezoid_alt') ??
    capture(/^([A-Za-z0-9_]+)\[\/([\s\S]*)\/\]$/, 'parallelogram') ??
    capture(/^([A-Za-z0-9_]+)\(([\s\S]*)\)$/, 'round') ??
    capture(/^([A-Za-z0-9_]+)\[([\s\S]*)\]$/, 'rect');

  if (byShape) return byShape;

  if (/^[A-Za-z0-9_]+$/.test(trimmed)) {
    return { id: trimmed, label: trimmed, shape: 'rect' };
  }
  throw new Error(`mermaidToJson: 无法解析节点 token "${token}"`);
}

/**
 * 合并节点定义，避免“裸 id”覆盖更完整的节点信息
 * @param current 已存在节点
 * @param incoming 新解析节点
 */
function mergeFlowchartNode(
  current: FlowchartJsonNode | undefined,
  incoming: FlowchartJsonNode,
): FlowchartJsonNode {
  if (!current) return incoming;
  const incomingIsBare = incoming.label === incoming.id && (incoming.shape ?? 'rect') === 'rect';
  if (incomingIsBare) return current;

  const currentIsBare = current.label === current.id && (current.shape ?? 'rect') === 'rect';
  if (currentIsBare) return incoming;

  return incoming;
}

/**
 * 反向解析 flowchart DSL 为结构化 JSON
 * @param mermaidCode Mermaid 源码
 */
export function mermaidToJson(mermaidCode: string): MermaidToJsonResult {
  const lines = mermaidCode
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('%%'));

  if (lines.length === 0) {
    throw new Error('mermaidToJson: 输入为空');
  }

  const header = lines[0].match(/^flowchart\s+(TB|LR|BT|RL)\s*$/);
  if (!header) {
    throw new Error(`mermaidToJson: 仅支持 flowchart，收到 "${lines[0]}"`);
  }
  const direction = header[1] as FlowchartDirection;

  const nodeMap = new Map<string, FlowchartJsonNode>();
  const edges: FlowchartJsonEdge[] = [];

  for (const line of lines.slice(1)) {
    const edgeMatch = line.match(/^(.*?)\s+-->(?:\|([\s\S]*?)\|)?\s+(.*?)$/);
    if (edgeMatch) {
      const fromNode = parseFlowchartNodeToken(edgeMatch[1]);
      const toNode = parseFlowchartNodeToken(edgeMatch[3]);
      const label = edgeMatch[2] != null ? parseFlowchartLabel(edgeMatch[2]) : undefined;

      nodeMap.set(fromNode.id, mergeFlowchartNode(nodeMap.get(fromNode.id), fromNode));
      nodeMap.set(toNode.id, mergeFlowchartNode(nodeMap.get(toNode.id), toNode));
      edges.push({
        from: fromNode.id,
        to: toNode.id,
        ...(label ? { label } : {}),
      });
      continue;
    }

    const node = parseFlowchartNodeToken(line);
    nodeMap.set(node.id, mergeFlowchartNode(nodeMap.get(node.id), node));
  }

  return {
    type: 'flowchart',
    direction,
    data: {
      nodes: Array.from(nodeMap.values()),
      edges,
    },
  };
}

/**
 * 将结构化 JSON 转为 Mermaid DSL 字符串
 * @param options 图表类型与数据；`flowchart` 下 `data` 需为 {@link FlowchartJsonData}
 * @returns 可直接交给 Mermaid 解析的源码
 * @throws 未实现的 `type` 或数据校验失败时抛出
 */
export function jsonToMermaid(options: JsonToMermaidOptions): string {
  if (options.type === 'flowchart') {
    return flowchartJsonToMermaid(options);
  }
  throw new Error(`jsonToMermaid: 暂不支持的图表类型 "${options.type}"`);
}
