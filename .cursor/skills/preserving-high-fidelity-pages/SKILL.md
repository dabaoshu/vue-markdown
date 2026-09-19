---
name: preserving-high-fidelity-pages
description: Preserves visual fidelity of an existing page instead of restyling it. Use when the user asks for 高保真, 还原, 1:1, 对照原型, 截图, or 保留原来的样式; when converting HTML files, live/intranet prototype URLs, screenshots, or design comps into Vue/React; or when a control (select, hover, empty state, fullscreen) looks different from the source.
---

# 完全保留高保真页面

有视觉源时，观感以源为准。内部可以重构；默认态和源里存在的交互态都要截图对照到看不出差别。

## 何时使用 / 何时不用

**使用：** 用户要高保真还原；源是 HTML、原型 URL、截图或设计稿；把静态页迁框架或把现有页改到和原型一致。

**不用：** 没有视觉源、从零做新 UI（让给 `frontend-design`）；纯数据/接口/逻辑、不涉及观感。

有视觉源时本 skill 优先于 `frontend-design`。用户同时要求「还原 + 美化」时：先 1:1 还原；美化必须另一次明确批准，不能混进同一次提交冒充高保真。

## 铁律

1. 视觉源说了算。禁止再设计、禁止顺便美化。
2. 冻观感，不冻代码。HTML/CSS/组件可拆可重构，截图必须对上。
3. 没拍到交互态就不算完成。
4. 不许发明源里没有的状态；看不清先问，不要用组件库默认皮肤顶上。

## 工作流

1. **锁定视觉源** — 写清唯一对照物。多源冲突先问。打不开内网就停，禁止凭记忆补样式。
2. **列状态清单** — 只登记源里真实存在的交互。表头：`状态 | 如何进入 | 要盯的区域 | 基线图 | 实现图`。
3. **拍基线** — 同一视口、同一数据。HTML 本地打开；URL 进浏览器；只有静态图就当基线。
4. **实现** — 目标是复现基线。颜色/字号/间距/圆角/阴影/动效以基线为准；scoped、路由、数据绑定可以改。
5. **对照** — 同样视口、同样操作再拍。漏控件、偏色、错间距、少了 hover/展开 = 未完成。
6. **修到看不出差别** — 只改偏离基线的地方；修完再拍。

需要挡「差不多就行」时，读 [references/rationalizations.md](references/rationalizations.md)。

## 状态（源里有才列入）

| 类型 | 例子 |
|------|------|
| 默认 | 首屏、列表有数据 |
| 指针 | hover 按钮、卡片、链接 |
| 焦点 | input / select 的 focus 描边 |
| 展开 | 下拉、日期、级联打开后的面板 |
| 空态 | 筛选无结果、列表为空 |
| 全屏 / 复位 | 场景类控件 |
| 选中 / 禁用 | 当前项、灰态按钮 |

截图：视口/缩放/数据与基线一致；文件名能对上（`select-open.baseline.png` / `select-open.actual.png`）；展开态等面板出现再拍；可裁切但两边范围相同。

## 完成门槛

清单每一项都有基线 + 实现对照，修过的已复拍。交付时用清单交代，不要只说「已经还原了」。

不算完成：只对了默认态；内网打不开却凭印象做完；用 Element 默认皮肤顶掉原型 select；「代码先落地，视觉下一轮再调」。
