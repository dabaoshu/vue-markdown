# componentsUtils

引擎层通用工具集合，当前包含 markdown table 解析与 think 分组能力（无 Vue UI 依赖）。

## 目录

- `core/`：基础类型与节点处理工具（纯函数，无框架依赖）
- `engine/`：解析流程编排（remark/rehype 插件、表格解析等）

## 使用示例

```ts
import { tableNodeParse, MergeThinkRemark } from '@nnnb/markdown';

const result = tableNodeParse(tableNode, {
  type: 'object',
  uuid: true
});

// remark 插件：合并连续 thinkFlow 为 thinkGroup
remarkPlugins={[MergeThinkRemark]}
// think / thinkGroup 的 Vue 展示组件由业务侧自行实现并传入 components
```

## 返回结构

- `columns: string[]`
- `data`
  - `type: 'string'` 时为 `string[][]`
  - `type: 'object'` 时为 `Array<Record<string, string | number>>`
