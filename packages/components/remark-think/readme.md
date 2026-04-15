# remark-think

`remark-think` 用于在 Markdown 中解析自定义标签（默认是 `<think>...</think>`），并将其转换为可渲染的节点结构。

## 目录分层

- `core/`：纯类型与基础能力
  - `type.ts`：事件与配置类型
  - `options.ts`：配置归一化与校验
  - `tag-code.ts`：字符到 micromark code 的映射
- `engine/`：语法构造与流程编排
  - `thinkFlow.ts`：块级标签解析
  - `thinkText.ts`：行内标签解析
  - `syntax.ts`：micromark 扩展组合
  - `remarkThink.ts`：remark 插件入口编排
- `adapters/`：外部协议适配
  - `fromMarkdownThink.ts`：from-markdown 节点转换

## 默认导出边界

`index.ts` 默认只导出引擎层能力与类型：

- `remarkThink`
- `thinkSyntax`
- `ThinkFlowOption`

> 说明：该边界用于避免将 UI 或框架层能力混入默认入口。

## 兼容导入（渐进迁移）

为保证现有调用不受影响，以下旧路径仍可用，但建议逐步迁移：

- `./fromMarkdownThink` -> `./adapters/fromMarkdownThink`
- `./thinkFlow` -> `./engine/thinkFlow`
- `./thinkText` -> `./engine/thinkText`
- `./syntax` -> `./engine/syntax`
- `./type` -> `./core/type`

## 使用示例

```ts
import { remarkThink } from '@your-scope/components/remark-think';

const plugins = [[remarkThink, { tags: ['think', 'analysis'] }]];
```

## 配置说明

### ThinkFlowOption

```ts
type ThinkFlowOption = {
  tags: string[];
  customTags?: string[];
};
```

- `tags`：可识别标签名集合，例如 `['think']`
- `customTags`：保留字段，默认会回落为 `tags`

## 设计约束

- 引擎层不依赖 Vue/React 等框架运行时。
- 通过参数与类型注入外部差异，保证可测试与可复用。
- 注释统一使用 JSDoc，重点说明输入输出与边界行为。
