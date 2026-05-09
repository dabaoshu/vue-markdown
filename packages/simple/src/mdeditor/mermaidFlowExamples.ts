/**
 * 复杂 Mermaid 流程图示例文案片段。
 * 供「图表」Tab 与其它 Markdown 演示拼接使用；每个示例均为完整的 mermaid 围栏代码块。
 */

/** 电商下单履约（多层 subgraph + 决策 + 注释）。 */
const ORDER_FULFILLMENT = `## 复杂示例 A：订单履约全流程（flowchart TB）

\`\`\`mermaid
flowchart TB
  subgraph client["客户端"]
    U([用户下单]) --> C{库存校验}
  end

  subgraph api["API 层"]
    C -->|充足| L[锁定库存]
    C -->|不足| R[返回缺货]
    L --> P{支付网关}
    P -->|成功| W[创建出库单]
    P -->|失败| RF[释放库存 + 退款指引]
  end

  subgraph storage["仓储"]
    W --> PK[拣货]
    PK --> SH[发货]
    SH --> DN([签收闭环])
  end

  R --> END1([结束])
  RF --> END1
  DN --> END2([完成])

  style U fill:#e8f4fc
  style END2 fill:#e6ffe6
\`\`\`
`;

/** 微服务 Saga / 补偿事务（sequenceDiagram + alt/opt/loop）。 */
const SAGA_SEQUENCE = `## 复杂示例 B：分布式下单 Saga（sequenceDiagram）

\`\`\`mermaid
sequenceDiagram
  autonumber
  participant U as 用户端
  participant O as 订单服务
  participant I as 库存服务
  participant P as 支付服务
  participant N as 通知服务

  U->>+O: 提交订单(orderId)
  O->>+I: TryReserve(stockId, qty)
  alt 库存足够
    I-->>O: Reserved OK
    O->>+P: Charge(amount)
    alt 支付成功
      P-->>O: Paid
      O->>I: ConfirmReserve
      O->>N: Push(下单成功)
      O-->>U: 200 OK
    else 支付失败
      P-->>O: Declined
      O->>I: CancelReserve
      O-->>U: 402 Payment Required
    end
  else 库存不足
    I-->>O: Conflict
    O-->>U: 409 库存不足
  end
  opt 异步重试
    O->>N: Push(补偿审计日志)
  end
  deactivate O
\`\`\`
`;

/** 多级网关与灰度发布（flowchart LR + classDef）。 */
const CANARY_FLOW = `## 复杂示例 C：网关灰度与回滚（flowchart LR）

\`\`\`mermaid
flowchart LR
  subgraph edge["边缘"]
    CLI([客户端]) --> GSLB[全局负载均衡]
  end

  subgraph gw["网关集群"]
    GSLB --> IG[Ingress-Nginx]
    IG --> R{路由策略}
    R -->|cookie.canary| V2[v2 Pod 10%]
    R -->|默认| V1[v1 Pod 90%]
  end

  subgraph observe["可观测"]
    V1 --> M[Metrics]
    V2 --> M
    M --> AL{错误率 > 阈值?}
    AL -->|是| RB[自动回滚 Canary]
    AL -->|否| OK([保持观测窗口])
  end

  classDef warn fill:#fff3cd,stroke:#856404
  classDef ok fill:#d4edda,stroke:#155724
  class RB warn
  class OK ok
\`\`\`
`;

/** 工单状态机（stateDiagram-v2 + 嵌套状态）。 */
const TICKET_STATE = `## 复杂示例 D：工单生命周期（stateDiagram-v2）

\`\`\`mermaid
stateDiagram-v2
  [*] --> 新建

  state 新建 {
    [*] --> 草稿
    草稿 --> 待评审 : 提交
    草稿 --> [*] : 废弃
  }

  待评审 --> 开发中 : 通过
  待评审 --> 已驳回 : 驳回

  state 开发中 {
    [*] --> 编码中
    编码中 --> 代码评审 : MR 开启
    代码评审 --> 编码中 : 需修改
    代码评审 --> 待测试 : 合并
  }

  开发中 --> 阻塞 : 依赖缺失
  阻塞 --> 开发中 : 依赖就绪

  待测试 --> 已关闭 : 验收通过
  待测试 --> 开发中 : 缺陷回流

  已驳回 --> [*]
  已关闭 --> [*]
\`\`\`
`;

/** ER：多对多与审计字段（部分项目需开启 ER 支持）。 */
const ER_SAMPLE = `## 复杂示例 E：领域 ER 草图（erDiagram）

\`\`\`mermaid
erDiagram
  USER ||--o{ ORDER : places
  ORDER ||--|{ ORDER_LINE : contains
  PRODUCT ||--o{ ORDER_LINE : referenced_by
  PAYMENT }o--|| ORDER : settles

  USER {
    uuid id PK
    string email UK
    datetime created_at
  }

  ORDER {
    uuid id PK
    uuid user_id FK
    string status
    decimal total_amount
  }

  PRODUCT {
    uuid id PK
    string sku UK
    int stock_qty
  }

  ORDER_LINE {
    uuid id PK
    uuid order_id FK
    uuid product_id FK
    int qty
    decimal unit_price
  }

  PAYMENT {
    uuid id PK
    uuid order_id FK
    string provider
    string transaction_ref UK
  }
\`\`\`
`;

/**
 * 拼接后的复杂示例 Markdown（含二级标题与 fenced 代码块）。
 */
export const MERMAID_COMPLEX_SAMPLES_MARKDOWN = [
  ORDER_FULFILLMENT,
  // SAGA_SEQUENCE,
  // CANARY_FLOW,
  // TICKET_STATE,
  // ER_SAMPLE
].join('\n');
