# Changelog

本文件记录已发布的 `@nnnb/markdown` 具体版本。文档站（`packages/docs`）与 playground（`packages/simple`）的改动不记在这里。1.0.4 及更早版本未公开完整日志。

## [1.1.0] - 2026-09-19

### Added

- 新增 `remarkHttpResource`：给绝对 `http(s)` 的 link / image 写入 kind、ext 标记，不改节点类型、不发请求。
- 可选 `promoteBareUrls`：把正文里的裸 `http(s)` URL 提升为 link 再打标。

## [1.0.5] - 2026-09-08

### Changed

- 对齐 v1.0.4 的发布入口，并固定本次 Demo / Mermaid 相关版本。

### Added

- Mermaid 预览导出改为从已渲染 SVG 栅格化 PNG，不再用 html2canvas 截预览容器。
