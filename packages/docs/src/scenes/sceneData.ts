import type { SceneId } from './constants';
import type { SceneMeta } from './types';
import { getSceneFeatures } from './sceneFeatures';

const ASSISTANT_MARKDOWN = `星河支付值班助手已接入工单 \`INC-20260918-0142\`。

<think>
先看网关：过去 15 分钟 checkout-api 没有成片 5xx，支付通道探针是绿的。
更像登录链路，而不是清算中断。
</think>

<think>
登录失败码集中在 MFA_REJECT。用户最近有换机记录。优先当 MFA 设备绑定过期处理。
</think>

现在可以判定：**不是支付通道宕机**，是后台 MFA 未通过。

## 已做的事
- [x] 核对网关 5xx
- [x] 核对 \`checkout-api\` 探针
- [ ] 请确认是否更换过手机

\`\`\`mermaid
flowchart TD
  A[无法登录支付后台] --> B{网关成片 5xx?}
  B -->|否| C{MFA 失败?}
  C -->|是| D[重置 MFA 绑定]
  C -->|否| E[继续查账号锁定]
  B -->|是| F[升级支付通道值班]
\`\`\`

现场截图（可打开）：

![登录页 MFA 提示](https://www.w3.org/Icons/w3c_home.png)

失效截图（会显示加载失败）：

![过期附件](https://www.w3.org/Icons/http-resource-demo-missing.png)

账号说明：[MFA 重置手册](https://example.com/manual.pdf)

下一步：回复「我换手机了」走重置；或把后四位发我，我帮你开重置单。`;

const SOP_MARKDOWN = `> 灰度窗口仅限工作日 10:00–11:30。窗口外发布需值班长签字。

## 发布前
1. 冻结非紧急变更
2. 确认回滚镜像 \`checkout-api:2026.09.17\`
3. 拉齐支付、风控、SRE

## 环境对照

| 环境 | 流量 | 负责人 |
| --- | ---: | --- |
| 预发 | 0% | 陈可 |
| 灰度 | 5% | 周宁 |
| 生产 | 95% | 值班长 |

\`\`\`mermaid
flowchart LR
  A[预发验收] --> B[5% 灰度]
  B --> C{错误率 < 0.5%?}
  C -->|是| D[全量]
  C -->|否| E[回滚]
\`\`\`

架构示意：

![网关示意](https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png)

## 回滚
错误率连续 3 分钟超过 0.5%，或支付成功率掉到 99% 以下，立即回滚并通知 \`INC-20260918-0142\` 值班群。`;

const POSTMORTEM_MARKDOWN = `# 订单超时升高复盘（2026-09-18）

## 时间线
- 09:12 监控：checkout 超时率 0.8% → 6%
- 09:18 定位库存只读副本延迟
- 09:31 切主库，超时率回落

\`\`\`mermaid
sequenceDiagram
  participant GW as 网关
  participant API as checkout-api
  participant STK as 库存
  GW->>API: 创建订单
  API->>STK: 预占库存
  STK-->>API: 延迟 2.4s
  API-->>GW: 504
\`\`\`

\`\`\`ts
// checkout-api 09:14 日志
TimeoutError: inventory.reserve exceeded 2000ms
\`\`\`

## 影响

| 指标 | 峰值 | 恢复后 |
| --- | ---: | ---: |
| 超时率 | 6.1% | 0.4% |
| 支付成功率 | 98.2% | 99.7% |

看板：[监控](https://example.com/grafana/checkout) · [日志](https://example.com/logs/checkout-api)

粗算：副本延迟若到 $t$ 秒，超时概率约随 $t^{2}$ 上升，扩容备忘见容量公式场景。`;

const REASONING_MARKDOWN = `<think>
用户说登不上。先排除通道，再看 MFA。
</think>

<think>
没有 5xx 风暴，MFA_REJECT 对得上换机。
</think>

结论：重置 MFA 即可，不用升级支付通道。`;

const ATTACHMENTS_MARKDOWN = `工单 \`INC-20260918-0142\` 的现场资料。点击图片或文件卡片可预览（演示环境不会去拉 example.com 的真实字节）。

成功图：

![收银台](https://www.w3.org/Icons/w3c_home.png)

失败图：

![缺失截图](https://www.w3.org/Icons/http-resource-demo-missing.png)

说明书：[操作手册](https://example.com/manual.pdf)

对账单：[9 月报表](https://example.com/report.xlsx)

抓包：[dump.zip](https://example.com/file.zip)

https://example.com/voice.mp3

本地备忘（不应出现分类徽标）：[现场记录](./local.png)

联系值班：[邮箱](mailto:oncall@example.com)`;

const INTAKE_MARKDOWN = `请用下面的表提交报障。提交后只留在这台浏览器里，值班同学会在工单 \`INC-20260918-0142\` 看到你填的内容（本演示不写服务器）。

紧急故障请打开「是否紧急」，并写清影响面。`;

const CAPACITY_MARKDOWN = `# checkout-api 扩容备忘

当前超时阈值为 $T = 2$ 秒。副本延迟均值 $\\mu$，粗估超时比例：

$$
P(t > T) \\approx e^{-T / \\mu}
$$

库存节点数建议保持

$$
\\begin{bmatrix}
n_{read} \\\\
n_{write}
\\end{bmatrix}
=
\\begin{bmatrix}
8 \\\\
2
\\end{bmatrix}
$$

$\\mu > 0.8$ 时先扩只读，再谈写库。`;

const SCENE_DEFS: Omit<SceneMeta, 'features'>[] = [
  {
    id: 'assistant',
    label: 'AI 助手回复',
    group: 'story',
    shell: 'assistant',
    description: '一条完整的运维助手回复：思考、步骤、流程图与附件；可再问一句',
    markdown: ASSISTANT_MARKDOWN
  },
  {
    id: 'sop',
    label: '发布变更 SOP',
    group: 'story',
    shell: 'article',
    description: '支付网关灰度发布手册：清单、环境表、发布流程',
    markdown: SOP_MARKDOWN
  },
  {
    id: 'postmortem',
    label: '线上故障复盘',
    group: 'story',
    shell: 'article',
    description: '订单超时复盘：时间线、时序图、日志与指标',
    markdown: POSTMORTEM_MARKDOWN
  },
  {
    id: 'reasoning',
    label: '助手推理过程',
    group: 'clip',
    shell: 'assistant',
    description: '同一问题的短问答，只看思考区如何折叠',
    markdown: REASONING_MARKDOWN
  },
  {
    id: 'attachments',
    label: '工单附件',
    group: 'clip',
    shell: 'ticket',
    description: '报修单里的图、PDF、表格和压缩包，点击可预览',
    markdown: ATTACHMENTS_MARKDOWN
  },
  {
    id: 'intake',
    label: '报障信息表',
    group: 'clip',
    shell: 'ticket',
    description: '填写并提交报障信息（仅本地演示）',
    markdown: INTAKE_MARKDOWN
  },
  {
    id: 'capacity',
    label: '容量公式',
    group: 'clip',
    shell: 'article',
    description: '扩容评估里的行内与块级公式',
    markdown: CAPACITY_MARKDOWN
  }
];

/** 7 个业务场景，顺序与 SCENE_IDS 一致。 */
export const sceneList: SceneMeta[] = SCENE_DEFS.map((def) => ({
  ...def,
  features: getSceneFeatures(def.id)
}));

const SCENE_MAP = new Map<SceneId, SceneMeta>(
  sceneList.map((scene) => [scene.id, scene])
);

/**
 * 按 id 取场景元数据；非法 id 抛错（页面层应先用 resolveSceneId）。
 *
 * @param id 场景 id
 */
export function getScene(id: SceneId): SceneMeta {
  const scene = SCENE_MAP.get(id);
  if (!scene) {
    throw new Error(`Unknown scene: ${id}`);
  }
  return scene;
}
