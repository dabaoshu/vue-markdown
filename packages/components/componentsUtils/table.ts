export const getTagChilds = (node, tagName) => {
  const match = (node) => node.type === 'element' && node.tagName === tagName;
  if (node.type === 'element' && node.children && node.children.length > 0) {
    return node.children.filter((o) => match(o));
  }
  return [];
};
export const tableNodeParse = (
  node,
  options?: {
    uuid: boolean;
    type: 'string' | 'object';
  } = {}
) => {
  let columns = [];
  let data = [];
  const thead = getTagChilds(node, 'thead')?.[0];
  if (thead) {
    const trNode = getTagChilds(thead, 'tr')[0];
    columns = getTagChilds(trNode, 'th').map((o) => o.children?.[0]?.value);
  }
  const tbody = getTagChilds(node, 'tbody')?.[0];

  if (tbody) {
    const trNodeList = getTagChilds(tbody, 'tr');
    data = trNodeList.map((o) => {
      const tds = getTagChilds(o, 'td').map((o) => o.children?.[0]?.value);
      return tds;
    });
  }
  if (options.type === 'object') {
    data = data.map((row, rowIdx) =>
      columns.reduce(
        (obj, key, idx) => ((obj[key] = row[idx]), obj),
        options.uuid
          ? {
              __uuid: rowIdx
            }
          : {}
      )
    );
  }
  return {
    columns,
    data
  };
};
