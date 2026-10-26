# Changelog

本文件记录 `@nnnb/markdown` 的版本变更，尚未发布的改动列在「未发布」中。文档站（`packages/docs`）与 playground（`packages/simple`）的改动不记在这里。1.0.4 及更早版本未公开完整日志。

## 未发布

### 修复

- 修复数学公式预处理还原代码块时，将代码中的特殊 `$` 组合误作字符串替换指令，导致内容被修改、重复膨胀甚至渲染卡死的问题。现在按原文还原代码块，正常公式转换与渲染效果保持不变。

## [1.1.1] - 2026-09-24

### Fixed

- Node 加载 dist 入口不再失败：ESM 产物里的 lodash 子路径带上 `.js`，`dist/lib` 按 CommonJS 执行。

## [1.1.0] - 2026-09-19

### Added

- 新增 `remarkHttpResource`：给绝对 `http(s)` 的 link / image 写入 kind、ext 标记，不改节点类型、不发请求。
- 可选 `promoteBareUrls`：把正文里的裸 `http(s)` URL 提升为 link 再打标。

## [1.0.5] - 2026-09-08

### Changed

- 对齐 v1.0.4 的发布入口，并固定本次 Demo / Mermaid 相关版本。

### Added

- Mermaid 预览导出改为从已渲染 SVG 栅格化 PNG，不再用 html2canvas 截预览容器。
