<template>
  <div>
    <Breadcrumb
      :items="items"
      :onChange="handleChange"
      :separatorIcon="ArrowRight"
    >
      <template #separatorIcon>
        <ArrowRight height="10px" width="10px"
      /></template>
    </Breadcrumb>
    <div v-tooltip="'这是一个提示文本'">鼠标悬浮查看提示</div>
    <div v-tooltip="'这是一个提示文本'">
      <div> <input type="text" v-model.lazy="sendVal" /></div>
      <ElTreeV2 :data="treeData">
        <template #default="{ node }">
          <span>{{ node.label }}</span>
          <span style="color: red; margin-left: auto; margin-right: 25px">{{
            node.data.id
          }}</span>
        </template>
      </ElTreeV2>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { Breadcrumb } from './dirTree';
  import { ArrowRight } from '@element-plus/icons-vue';
  import { ref, onMounted } from 'vue';
  import { ElTreeV2 } from 'element-plus';
  import { arrayToTree } from './utils/utils';
  onMounted(() => {
    localStorage.setItem(
      'devConfig',
      JSON.stringify({
        chatshow: false,
        otherFeature: true
      })
    );
  });

  const sendVal = `文件夹`;

  const treeData = arrayToTree(
    [
      {
        parent: '-1',
        name: '全部文件',
        id: '1',
        index: 0
      },
      {
        parent: '1',
        name: '文件夹1',
        id: '2',
        index: 0
      },
      {
        parent: '1',
        name: '文件夹2',
        id: '3',
        index: 1
      },
      {
        parent: '2',
        name: '子文件夹1-1',
        id: '4',
        index: 0
      },
      {
        parent: '2',
        name: '子文件夹1-2',
        id: '5',
        index: 1
      },
      {
        parent: '3',
        name: '子文件夹2-1',
        id: '6',
        index: 0
      },
      {
        parent: '3',
        name: '子文件夹2-2',
        id: '7',
        index: 1
      },
      {
        parent: '4',
        name: '子文件夹1-1-1',
        id: '8',
        index: 0
      },
      {
        parent: '4',
        name: '子文件夹1-1-2',
        id: '9',
        index: 1
      },
      {
        parent: '5',
        name: '子文件夹1-2-1',
        id: '10',
        index: 0
      },
      {
        parent: '5',
        name: '子文件夹1-2-2',
        id: '11',
        index: 1
      },
      {
        parent: '6',
        name: '子文件夹2-1-1',
        id: '12',
        index: 0
      },
      {
        parent: '6',
        name: '子文件夹2-1-2',
        id: '13',
        index: 1
      },
      {
        parent: '7',
        name: '子文件夹2-2-1',
        id: '14',
        index: 0
      },
      {
        parent: '7',
        name: '子文件夹2-2-2',
        id: '15',
        index: 1
      },
      {
        parent: '8',
        name: '子文件夹1-1-1-1',
        id: '16',
        index: 0
      },
      {
        parent: '8',
        name: '子文件夹1-1-1-2',
        id: '17',
        index: 1
      },
      {
        parent: '9',
        name: '子文件夹1-1-2-1',
        id: '18',
        index: 0
      },
      {
        parent: '9',
        name: '子文件夹1-1-2-2',
        id: '19',
        index: 1
      },
      {
        parent: '10',
        name: '子文件夹1-2-1-1',
        id: '20',
        index: 0
      },
      {
        parent: '10',
        name: '子文件夹1-2-1-2',
        id: '21',
        index: 1
      },
      {
        parent: '11',
        name: '子文件夹1-2-2-1',
        id: '22',
        index: 0
      },
      {
        parent: '11',
        name: '子文件夹1-2-2-2',
        id: '23',
        index: 1
      },
      {
        parent: '12',
        name: '子文件夹2-1-1-1',
        id: '24',
        index: 0
      },
      {
        parent: '12',
        name: '子文件夹2-1-1-2',
        id: '25',
        index: 1
      },
      {
        parent: '13',
        name: '子文件夹2-1-2-1',
        id: '26',
        index: 0
      },
      {
        parent: '13',
        name: '子文件夹2-1-2-2',
        id: '27',
        index: 1
      },
      {
        parent: '14',
        name: '子文件夹2-2-1-1',
        id: '28',
        index: 0
      },
      {
        parent: '14',
        name: '子文件夹2-2-1-2',
        id: '29',
        index: 1
      },
      {
        parent: '15',
        name: '子文件夹2-2-2-1',
        id: '30',
        index: 0
      },
      {
        parent: '15',
        name: '子文件夹2-2-2-2',
        id: '31',
        index: 1
      },
      {
        parent: '16',
        name: '子文件夹1-1-1-1-1',
        id: '32',
        index: 0
      },
      {
        parent: '16',
        name: '子文件夹1-1-1-1-2',
        id: '33',
        index: 1
      },
      {
        parent: '17',
        name: '子文件夹1-1-1-2-1',
        id: '34',
        index: 0
      },
      {
        parent: '17',
        name: '子文件夹1-1-1-2-2',
        id: '35',
        index: 1
      },
      {
        parent: '18',
        name: '子文件夹1-1-2-1-1',
        id: '36',
        index: 0
      },
      {
        parent: '18',
        name: '子文件夹1-1-2-1-2',
        id: '37',
        index: 1
      },
      {
        parent: '19',
        name: '子文件夹1-1-2-2-1',
        id: '38',
        index: 0
      },
      {
        parent: '19',
        name: '子文件夹1-1-2-2-2',
        id: '39',
        index: 1
      },
      {
        parent: '20',
        name: '子文件夹1-2-1-1-1',
        id: '40',
        index: 0
      },
      {
        parent: '20',
        name: '子文件夹1-2-1-1-2',
        id: '41',
        index: 1
      },
      {
        parent: '21',
        name: '子文件夹1-2-1-2-1',
        id: '42',
        index: 0
      },
      {
        parent: '21',
        name: '子文件夹1-2-1-2-2',
        id: '43',
        index: 1
      },
      {
        parent: '22',
        name: '子文件夹1-2-2-1-1',
        id: '44',
        index: 0
      },
      {
        parent: '22',
        name: '子文件夹1-2-2-1-2',
        id: '45',
        index: 1
      },
      {
        parent: '23',
        name: '子文件夹1-2-2-2-1',
        id: '46',
        index: 0
      },
      {
        parent: '23',
        name: '子文件夹1-2-2-2-2',
        id: '47',
        index: 1
      }
    ].map((item) => ({
      label: item.name,
      ...item
    }))
  );

  const handleChange = (
    item: any,
    key: string,
    path: string[],
    index: number
  ) => {
    console.log(item, key, path, index);
  };

  const items = ref([
    {
      name: '全部文件',
      key: 'all'
    },
    {
      name: '文件夹1',
      key: 'folder1'
    },
    {
      name: '文件夹2',
      key: 'folder2'
    },
    {
      name: '文件夹3',
      key: 'folder3'
    }
  ]);

  const delay = (time: number) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, time);
    });
  };
</script>
