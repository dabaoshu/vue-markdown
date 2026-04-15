import { getNodeText, getTagChilds } from '../core';
import type {
  MarkdownLikeNode,
  TableNodeParseOptions,
  TableNodeParseResult,
  TableObjectRow
} from '../core';

/**
 * 从表头行提取列名。
 *
 * @param trNode 表头 tr 节点
 * @returns 列名数组
 */
function parseColumns(trNode?: MarkdownLikeNode): string[] {
  if (!trNode) {
    return [];
  }
  return getTagChilds(trNode, 'th').map((thNode) => getNodeText(thNode).trim());
}

/**
 * 从表体节点提取二维行数据。
 *
 * @param tbodyNode 表体 tbody 节点
 * @returns 行数据
 */
function parseRows(tbodyNode?: MarkdownLikeNode): string[][] {
  if (!tbodyNode) {
    return [];
  }

  return getTagChilds(tbodyNode, 'tr').map((trNode) =>
    getTagChilds(trNode, 'td').map((tdNode) => getNodeText(tdNode).trim())
  );
}

/**
 * 将二维数组行数据转换为对象行数据。
 *
 * @param columns 列名
 * @param rows 原始二维数组行数据
 * @param includeUuid 是否注入 `__uuid`
 * @returns 对象行数据
 */
function toObjectRows(columns: string[], rows: string[][], includeUuid: boolean): TableObjectRow[] {
  return rows.map((row, rowIdx) => {
    const baseRow: TableObjectRow = includeUuid ? { __uuid: rowIdx } : {};

    columns.forEach((columnName, columnIndex) => {
      baseRow[columnName] = row[columnIndex] ?? '';
    });

    return baseRow;
  });
}

/**
 * 解析 markdown table 节点，输出列信息与行数据。
 *
 * @param node table 节点
 * @param options 解析配置
 * @returns 列与数据
 */
export function tableNodeParse(
  node: MarkdownLikeNode,
  options: TableNodeParseOptions = {}
): TableNodeParseResult {
  const parseType = options.type ?? 'string';
  const includeUuid = options.uuid ?? false;

  const theadNode = getTagChilds(node, 'thead')[0];
  const tbodyNode = getTagChilds(node, 'tbody')[0];
  const headerTrNode = getTagChilds(theadNode, 'tr')[0];

  const columns = parseColumns(headerTrNode);
  const rowData = parseRows(tbodyNode);

  if (parseType === 'object') {
    return {
      columns,
      data: toObjectRows(columns, rowData, includeUuid)
    };
  }

  return {
    columns,
    data: rowData
  };
}
