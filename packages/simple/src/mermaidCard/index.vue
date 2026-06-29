<template>
  <div class="mermaid-card-demo">
    <h2 class="mermaid-card-demo__title">Mermaid 卡片组件演示</h2>
    <p class="mermaid-card-demo__desc">
      高保真卡片 UI：标题栏、渲染状态徽章、Mermaid 语法 / 渲染效果 Tab 切换；渲染完成后源码可编辑。
    </p>

    <label class="mermaid-card-demo__field">
      <span>卡片标题</span>
      <input v-model="title" type="text" placeholder="思维导图生成" />
    </label>

    <MermaidInteractiveBlock v-model:code="sampleCode" :title="title" />

    <details class="mermaid-card-demo__source">
      <summary>查看示例源码</summary>
      <pre>{{ sampleCode }}</pre>
    </details>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import MermaidInteractiveBlock from '@/components/markdown/code_mermaid_card';

  const title = ref('思维导图生成');

  /** 演示用 mindmap 样例，与产品设计稿一致 */
  const sampleCode = ref(`mindmap
  root((智能体平台官方插件))
    用户输入
      自然语言描述诉求
      上传图片或文档
      提供主题或数据
    智能体识别
      判断任务意图
      选择合适插件
      组织插件入参
    插件能力
      图片理解
        调用 DocChain 封装能力
        返回图片内容理解
      文档读取
        调用 DocChain 封装接口
        返回摘要与问答依据
      图片生成
        推理平台部署生图模型
        安全策略拦截风险内容
      图表生成
        复用存量插件能力`);
</script>

<style scoped lang="scss">
  .mermaid-card-demo {
    padding: 8px 0 32px;
  }

  .mermaid-card-demo__title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 600;
    color: #0f172a;
  }

  .mermaid-card-demo__desc {
    margin: 0 0 20px;
    font-size: 14px;
    line-height: 1.6;
    color: #64748b;
  }

  .mermaid-card-demo__field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 320px;
    margin-bottom: 20px;
    font-size: 13px;
    color: #334155;

    input {
      height: 36px;
      padding: 0 10px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
    }
  }

  .mermaid-card-demo__source {
    margin-top: 24px;
    font-size: 13px;
    color: #64748b;

    summary {
      cursor: pointer;
      user-select: none;
      color: #334155;
      font-weight: 500;
    }

    pre {
      margin: 12px 0 0;
      padding: 14px 16px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      overflow: auto;
      font-size: 12px;
      line-height: 1.6;
      color: #334155;
    }
  }
</style>
