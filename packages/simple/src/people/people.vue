<template>
  <div class="people-picker">
    <div class="people-picker__left">
      <!-- 自定义形象区域 -->
      <div class="people-picker__custom">
        <div class="people-picker__section-title">自定义形象</div>
        <div class="people-picker__custom-row">
          <!-- 加号卡片（只展示样式，目前不做逻辑） -->
          <button type="button" class="people-picker__custom-card people-picker__custom-card--add">
            <span class="people-picker__custom-add-icon">+</span>
          </button>

          <!-- 自定义形象卡片（mock 数据） -->
          <PeopleCard
            v-for="item in customList"
            :key="item.id"
            :image="item.avatar"
            :name="item.name"
            :status="item.status"
            :show-menu="true"
            @rename="renameCustom(item.id)"
            @remove="removeCustom(item.id)"
          />
        </div>
      </div>

      <div class="people-picker__section-title people-picker__section-title--official">
        官方形象
      </div>

      <div class="people-picker__filters">
        <button
          class="people-picker__filter-btn"
          :class="{ 'is-active': genderFilter === 'all' }"
          type="button"
          @click="changeGender('all')"
        >
          全部
        </button>
        <button
          class="people-picker__filter-btn"
          :class="{ 'is-active': genderFilter === 'female' }"
          type="button"
          @click="changeGender('female')"
        >
          女生
        </button>
        <button
          class="people-picker__filter-btn"
          :class="{ 'is-active': genderFilter === 'male' }"
          type="button"
          @click="changeGender('male')"
        >
          男生
        </button>
      </div>

      <div class="people-picker__list">
        <div v-if="loading" class="people-picker__state"> 加载中... </div>
        <div
          v-else-if="errorMessage"
          class="people-picker__state people-picker__state--error"
        >
          {{ errorMessage }}
        </div>
        <div v-else-if="filteredList.length === 0" class="people-picker__state">
          暂无数据
        </div>
        <div v-else class="people-picker__grid">
          <PeopleCard
            v-for="item in filteredList"
            :key="item.id"
            :image="item.avatarSmall || item.avatarLarge"
            :name="item.name"
            :selected="selectedPerson && selectedPerson.id === item.id"
            @select="handleSelect(item)"
          />
        </div>
      </div>
    </div>

    <div class="people-picker__right">
      <div v-if="selectedPerson" class="people-picker__preview">
        <div class="people-picker__preview-avatar">
          <img
            :src="selectedPerson.avatarLarge || selectedPerson.avatarSmall"
            :alt="selectedPerson.name"
          />
        </div>
        <div class="people-picker__preview-name">
          {{ selectedPerson.name }}
        </div>
      </div>
      <div
        v-else
        class="people-picker__preview people-picker__preview--placeholder"
      >
        请选择一位官方形象
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue';
  import PeopleCard from './PeopleCard.vue';

  /**
   * 人物性别类型
   *
   * - "female": 女
   * - "male": 男
   * - "other": 其他/未标注
   */
  type PersonGender = 'female' | 'male' | 'other';

  /**
   * 性别筛选类型
   *
   * - "all": 全部
   * - "female": 女生
   * - "male": 男生
   */
  type GenderFilter = 'all' | 'female' | 'male';

  /**
   * 官方形象人物数据结构
   */
  interface PersonItem {
    /**
     * 唯一标识
     */
    id: string | number;
    /**
     * 人物名称
     */
    name: string;
    /**
     * 性别
     */
    gender: PersonGender;
    /**
     * 小头像地址（用于左侧列表展示）
     */
    avatarSmall: string;
    /**
     * 大图地址（用于右侧放大预览）
     */
    avatarLarge: string;
  }

  /**
   * 自定义形象卡片数据结构（mock）
   */
  interface CustomAvatarItem {
    /**
     * 唯一标识
     */
    id: string | number;
    /**
     * 名称
     */
    name: string;
    /**
     * 头像地址
     */
    avatar: string;
    /**
     * 状态：生成中 / 已完成
     */
    status: 'generating' | 'done';
  }

  /**
   * 组件对外 props
   */
  const props = defineProps<{
    /**
     * 获取官方形象列表的接口地址
     *
     * 接口返回的数据结构应为 `PersonItem[]`。
     */
    apiUrl: string;
    /**
     * 默认性别筛选
     *
     * - "all": 全部
     * - "female": 女生
     * - "male": 男生
     */
    defaultGender?: GenderFilter;
  }>();

  /**
   * 组件对外事件
   */
  const emit = defineEmits<{
    /**
     * 当前选中人物变化时触发
     *
     * @param event 事件名
     * @param person 当前选中的人物数据，可能为 null（例如列表为空时）
     */
    (event: 'update:selected', person: PersonItem | null): void;
  }>();

  /**
   * 人物完整列表（接口返回原始数据）
   */
  const peopleList = ref<PersonItem[]>([]);

  /**
   * 当前是否处于加载中
   */
  const loading = ref<boolean>(false);

  /**
   * 错误消息（接口请求失败时使用）
   */
  const errorMessage = ref<string>('');

  /**
   * 当前性别筛选
   */
  const genderFilter = ref<GenderFilter>(props.defaultGender ?? 'all');

  /**
   * 当前选中的人物
   */
  const selectedPerson = ref<PersonItem | null>(null);

  /**
   * 自定义形象 mock 列表
   */
  const customList = ref<CustomAvatarItem[]>([
    {
      id: 1,
      name: '生成中',
      avatar:
        'https://via.placeholder.com/120x140.png?text=%E7%94%9F%E6%88%90%E4%B8%AD',
      status: 'generating'
    },
    {
      id: 2,
      name: '商务形象 A',
      avatar:
        'https://via.placeholder.com/120x140.png?text=Avatar+A',
      status: 'done'
    },
    {
      id: 3,
      name: '商务形象 B',
      avatar:
        'https://via.placeholder.com/120x140.png?text=Avatar+B',
      status: 'done'
    }
  ]);

  /**
   * 根据性别筛选后的列表
   */
  const filteredList = computed<PersonItem[]>(() => {
    if (genderFilter.value === 'all') {
      return peopleList.value;
    }

    return peopleList.value.filter(
      (item) => item.gender === genderFilter.value
    );
  });

  /**
   * 根据当前过滤结果设置默认选中项
   */
  const setDefaultSelected = (): void => {
    if (filteredList.value.length > 0) {
      selectedPerson.value = filteredList.value[0] ?? null;
    } else {
      selectedPerson.value = null;
    }

    emit('update:selected', selectedPerson.value);
  };

  /**
   * 重命名自定义形象（仅作用于本地 mock 数据）
   *
   * @param id 自定义形象 id
   */
  const renameCustom = (id: string | number): void => {
    const target = customList.value.find((item) => item.id === id);

    if (!target) {
      return;
    }

    // 简单使用浏览器原生 prompt 做演示
    // eslint-disable-next-line no-alert
    const newName = window.prompt('请输入新的名称', target.name);

    if (!newName) {
      return;
    }

    target.name = newName;
  };

  /**
   * 删除自定义形象（仅作用于本地 mock 数据）
   *
   * @param id 自定义形象 id
   */
  const removeCustom = (id: string | number): void => {
    customList.value = customList.value.filter((item) => item.id !== id);
  };

  /**
   * 从远程接口拉取官方形象列表
   */
  const fetchPeople = async (): Promise<void> => {
    loading.value = true;
    errorMessage.value = '';

    try {
      const response = await fetch(props.apiUrl, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`接口返回状态码异常: ${response.status}`);
      }

      const data = (await response.json()) as PersonItem[];

      if (!Array.isArray(data)) {
        throw new Error('接口返回数据格式不正确，应为数组');
      }

      peopleList.value = data;
      setDefaultSelected();
    } catch (error) {
      console.error('[PeoplePicker] 获取官方形象列表失败', error);
      errorMessage.value = '获取官方形象列表失败，请稍后重试';
      peopleList.value = [];
      selectedPerson.value = null;
      emit('update:selected', null);
    } finally {
      loading.value = false;
    }
  };

  /**
   * 切换性别筛选
   *
   * @param value 目标筛选值
   */
  const changeGender = (value: GenderFilter): void => {
    if (genderFilter.value === value) {
      return;
    }

    genderFilter.value = value;
    setDefaultSelected();
  };

  /**
   * 选中某个人物
   *
   * @param person 被选中的人物
   */
  const handleSelect = (person: PersonItem): void => {
    selectedPerson.value = person;
    emit('update:selected', person);
  };

  onMounted(() => {
    if (!props.apiUrl) {
      console.error('[PeoplePicker] 未传入 apiUrl，无法请求官方形象列表');
      errorMessage.value = '组件未配置数据接口，无法加载官方形象列表';
      return;
    }

    void fetchPeople();
  });
</script>

<style scoped>
  .people-picker {
    display: flex;
    box-sizing: border-box;
    width: 100%;
    min-height: 360px;
    padding: 16px 24px;
    background: #ffffff;
  }

  .people-picker__left {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-right: 24px;
  }

  .people-picker__right {
    width: 320px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f5f9ff, #e9f2ff);
    border-radius: 16px;
  }

  .people-picker__section-title {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #2b3348;
  }

  .people-picker__section-title--official {
    margin-top: 8px;
  }

  .people-picker__custom {
    margin-bottom: 16px;
  }

  .people-picker__custom-row {
    display: flex;
    align-items: stretch;
    gap: 12px;
  }

  .people-picker__custom-card {
    position: relative;
    width: 120px;
    height: 140px;
    border-radius: 10px;
    border: 1px solid transparent;
    background-color: #ffffff;
    padding: 8px 6px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    cursor: default;
    transition: all 0.2s ease;
  }

  .people-picker__custom-card:hover {
    border-color: #4c7dff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }

  .people-picker__custom-card--add {
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .people-picker__custom-add-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px dashed #b7bfd3;
    color: #4c7dff;
    font-size: 20px;
  }

  .people-picker__custom-avatar-wrapper {
    position: relative;
    flex: 1;
    border-radius: 8px;
    overflow: hidden;
    background-color: #edf0f7;
  }

  .people-picker__custom-avatar-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .people-picker__custom-mask {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.45);
    color: #ffffff;
    font-size: 12px;
  }

  .people-picker__custom-footer {
    margin-top: 6px;
    display: flex;
    align-items: center;
  }

  .people-picker__custom-name {
    flex: 1;
    font-size: 12px;
    color: #3b4256;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .people-picker__custom-menu-wrap {
    position: relative;
    margin-left: 4px;
  }

  .people-picker__custom-menu-btn {
    width: 24px;
    height: 24px;
    border-radius: 12px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    color: #7a8198;
  }

  .people-picker__custom-menu-btn:hover {
    background-color: #eef1f8;
  }

  .people-picker__custom-menu {
    position: absolute;
    right: 0;
    top: 28px;
    min-width: 92px;
    border-radius: 8px;
    background-color: #ffffff;
    box-shadow: 0 8px 16px rgba(15, 35, 95, 0.18);
    padding: 4px 0;
    z-index: 10;
  }

  .people-picker__custom-menu-item {
    width: 100%;
    padding: 6px 12px;
    text-align: left;
    border: none;
    background: transparent;
    font-size: 12px;
    color: #2b3348;
    cursor: pointer;
  }

  .people-picker__custom-menu-item:hover {
    background-color: #f3f5fb;
  }

  .people-picker__custom-menu-item--danger {
    color: #d93026;
  }

  .people-picker__filters {
    display: flex;
    margin-bottom: 12px;
  }

  .people-picker__filter-btn {
    min-width: 72px;
    padding: 6px 12px;
    margin-right: 8px;
    border-radius: 16px;
    border: 1px solid #d0d7e2;
    background-color: #ffffff;
    color: #3b4256;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .people-picker__filter-btn:last-child {
    margin-right: 0;
  }

  .people-picker__filter-btn:hover {
    border-color: #4c7dff;
    color: #2f5ed8;
  }

  .people-picker__filter-btn.is-active {
    border-color: #4c7dff;
    background-color: #4c7dff;
    color: #ffffff;
  }

  .people-picker__list {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid #e1e5ee;
    background-color: #f9fafc;
    overflow: hidden;
  }

  .people-picker__state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #8086a0;
    font-size: 13px;
  }

  .people-picker__state--error {
    color: #d93026;
  }

  .people-picker__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    max-height: 320px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .people-picker__card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 6px;
    border-radius: 10px;
    border: 1px solid transparent;
    background-color: #ffffff;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .people-picker__card:hover {
    border-color: #4c7dff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }

  .people-picker__card.is-selected {
    border-color: #4c7dff;
    box-shadow: 0 0 0 1px rgba(76, 125, 255, 0.4);
  }

  .people-picker__card-avatar {
    width: 72px;
    height: 72px;
    border-radius: 12px;
    overflow: hidden;
    background-color: #f2f4f8;
  }

  .people-picker__card-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .people-picker__card-name {
    margin-top: 6px;
    font-size: 12px;
    color: #3b4256;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .people-picker__preview {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    box-sizing: border-box;
  }

  .people-picker__preview-avatar {
    width: 220px;
    height: 280px;
    border-radius: 18px;
    overflow: hidden;
    background-color: #f2f4f8;
    box-shadow: 0 8px 24px rgba(15, 35, 95, 0.16);
  }

  .people-picker__preview-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .people-picker__preview-name {
    margin-top: 16px;
    padding: 4px 12px;
    border-radius: 999px;
    background-color: rgba(255, 255, 255, 0.9);
    color: #2b3348;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  }

  .people-picker__preview--placeholder {
    color: #6b7390;
    font-size: 14px;
  }

  @media (max-width: 960px) {
    .people-picker {
      flex-direction: column;
    }

    .people-picker__left {
      margin-right: 0;
      margin-bottom: 16px;
    }

    .people-picker__right {
      width: 100%;
      min-height: 260px;
    }
  }
</style>
