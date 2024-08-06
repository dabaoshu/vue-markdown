<template>
  <div>
    <textarea v-model="source" />

    <demo :source="source" />
  </div>
</template>

<script lang="ts" setup>
  import demo from './index';
  import { ref, watch } from 'vue';
  const source = ref(
    '# Yuan2.0\n\n[Yuan2.0](https://github.com/IEIT-Yuan/Yuan-2.0) is a new generation Fundamental Large Language Model developed by IEIT System. We have published all three models, Yuan 2.0-102B, Yuan 2.0-51B, and Yuan 2.0-2B. And we provide relevant scripts for pretraining, fine-tuning, and inference services for other developers. Yuan2.0 is based on Yuan1.0, utilizing a wider range of high-quality pre training data and instruction fine-tuning datasets to enhance the model\'s understanding of semantics, mathematics, reasoning, code, knowledge, and other aspects.\n\nThis example goes over how to use LangChain to interact with `Yuan2.0`(2B/51B/102B) Inference for text generation.\n\nYuan2.0 set up an inference service so user just need request the inference api to get result, which is introduced in [Yuan2.0 Inference-Server](https://github.com/IEIT-Yuan/Yuan-2.0/blob/main/docs/inference_server.md).\n\n\n```python\nfrom langchain.chains import LLMChain\nfrom langchain_community.llms.yuan2 import Yuan2\n```\n\n\n```python\n# default infer_api for a local deployed Yuan2.0 inference server\ninfer_api = "http://127.0.0.1:8000/yuan"\n\n# direct access endpoint in a proxied environment\n# import os\n# os.environ["no_proxy"]="localhost,127.0.0.1,::1"\n\nyuan_llm = Yuan2(\n    infer_api=infer_api,\n    max_tokens=2048,\n    temp=1.0,\n    top_p=0.9,\n    use_history=False,\n)\n\n# turn on use_history only when you want the Yuan2.0 to keep track of the conversation history\n# and send the accumulated context to the backend model api, which make it stateful. By default it is stateless.\n# llm.use_history = True\n```\n\n\n```python\nquestion = "请介绍一下中国。"\n```\n\n\n```python\nprint(yuan_llm.invoke(question))\n```'
  );
  watch(source, () => {
    console.log({ a: source.value });
  });
</script>
