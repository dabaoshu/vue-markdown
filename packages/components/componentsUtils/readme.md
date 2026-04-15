# componentsUtils

引擎层通用工具集合，当前包含 markdown table 解析能力。

## 目录

- `core/`：基础类型与节点处理工具（纯函数，无框架依赖）
- `engine/`：解析流程编排（基于 core 能力）

## 使用示例

```ts
import { tableNodeParse } from '../componentsUtils';

const result = tableNodeParse(tableNode, {
  type: 'object',
  uuid: true
});
```

## 返回结构

- `columns: string[]`
- `data`
  - `type: 'string'` 时为 `string[][]`
  - `type: 'object'` 时为 `Array<Record<string, string | number>>`
