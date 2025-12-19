// 将数组转成树
export function arrayToTree(
  array,
  id = 'id',
  pid = 'parentId',
  children = 'children',
  maxLevel = 3
) {
  const data = [...array];
  const result = [];
  const hash = {};
  data.forEach((item) => {
    hash[item[id]] = item;
  });
  data.forEach((item) => {
    const hashVP = item[pid] === item[id] ? undefined : hash[item[pid]];
    if (hashVP) {
      if (!hashVP[children]) {
        hashVP[children] = [];
      }
      hashVP[children].push(item);
    } else {
      result.push(item);
    }
  });
  return result;
}

// 智能体名称校验
export function validateAgentName(name: string): true | string {
  const REQUIRED_PREFIX = '大瓦特-';
  const REG_VALID_CHAR = /^[\u4e00-\u9fa5a-zA-Z0-9\-_]+$/;
  const REG_FORMAT = /^大瓦特\-[\u4e00-\u9fa5a-zA-Z0-9]+$/;

  // 1. 必填
  if (!name || !name.trim()) {
    return '请输入智能体名称，确保名称符合“大瓦特-智能体名称”，名字请控制它在 3-50 个字符范围内，确保它是独一无二的哦';
  }

  // 2. 长度
  if (name.length < 3 || name.length > 50) {
    return '名称总长度需控制在 3-50个字符范围内，请调整字数后重试';
  }

  // 3. 合法字符
  if (!REG_VALID_CHAR.test(name)) {
    return '仅支持中文、英文、数字及中划线（-）、下划线（_）';
  }

  // 4. 格式
  if (!REG_FORMAT.test(name)) {
    return '需严格遵循 “大瓦特-智能体名称”格式，“大瓦特-”为必要前缀，前缀后直接衔接知识库名称，中间不得插入任何特殊字符（如-、_等）。示例：大瓦特-识别鸟窝助手';
  }

  // 5. 禁用词
  if (/测试|试用/.test(name)) {
    return '不可使用 “测试”“试用” 字样';
  }

  // 6. 禁止纯英文/纯数字/纯特殊字符
  const agentName = name.slice(REQUIRED_PREFIX.length);
  if (
    /^[a-zA-Z]+$/.test(agentName) ||
    /^[0-9]+$/.test(agentName) ||
    /^[-_]+$/.test(agentName)
  ) {
    return '禁止以纯英文、纯特殊字符（中划线、下划线）、纯数字作为名称';
  }

  return true;
}
