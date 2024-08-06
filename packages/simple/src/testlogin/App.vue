<template>
  <div>
    <button @click="fastLogin"> 单点登录</button>
    <button @click="set"> set cookie</button>
    <button @click="clearCookie"> 清空cookie</button>
  </div>
</template>

<script lang="ts" setup>
  import { onMounted } from 'vue';
  import cookie from './cookie';

  onMounted(() => {
    console.log('App.vue');
    const gaixc_token = cookie.get('gaixc_token');
    // if (!gaixc_token) {
    //   cookie.set('gaixc_token', 'aaaa', 1);
    // }

    console.log(cookie.get('gaixc_token'));
  });

  const fastLogin = () => {
    window.open('/gaixcAiagentPage');
  };
  const clearCookie = () => {
    cookie.delete('gaixc_token');
  };

  const set = () => {
    cookie.set('gaixc_token', '5555', 1);
  };
</script>
