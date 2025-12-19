<template>
  <div
    class="people-card"
    :class="{ 'is-selected': selected }"
    @click="handleSelect"
  >
    <div class="people-card__avatar">
      <img :src="image" :alt="name" />

      <div v-if="status === 'generating'" class="people-card__mask">
        生成中
      </div>
    </div>

    <div class="people-card__footer">
      <span class="people-card__name">
        {{ name }}
      </span>

      <div v-if="showMenu" class="people-card__menu">
        <el-dropdown trigger="click" @command="handleCommand">
          <span class="people-card__menu-btn" @click.stop> ··· </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="rename">重命名</el-dropdown-item>
              <el-dropdown-item command="remove" divided>
                删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  /**
   * 自定义形象生成状态
   */
  type GenerateStatus = 'generating' | 'done' | undefined;

  /**
   * 卡片组件 props
   */
  const props = defineProps<{
    /**
     * 头像地址
     */
    image: string;
    /**
     * 显示名称
     */
    name: string;
    /**
     * 是否为当前选中
     */
    selected?: boolean;
    /**
     * 生成状态，仅自定义形象使用
     */
    status?: GenerateStatus;
    /**
     * 是否展示右上角菜单
     */
    showMenu?: boolean;
  }>();

  /**
   * 组件对外事件
   */
  const emit = defineEmits<{
    /**
     * 点击卡片时触发
     */
    (event: 'select'): void;
    /**
     * 点击“重命名”时触发
     */
    (event: 'rename'): void;
    /**
     * 点击“删除”时触发
     */
    (event: 'remove'): void;
  }>();

  /**
   * 处理卡片点击
   */
  const handleSelect = (): void => {
    emit('select');
  };

  /**
   * 处理菜单命令
   *
   * @param command Element Plus 下拉菜单命令
   */
  const handleCommand = (command: 'rename' | 'remove'): void => {
    if (command === 'rename') {
      emit('rename');
      return;
    }

    if (command === 'remove') {
      emit('remove');
    }
  };
</script>

<style scoped>
  .people-card {
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

  .people-card:hover {
    border-color: #4c7dff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }

  .people-card.is-selected {
    border-color: #4c7dff;
    box-shadow: 0 0 0 1px rgba(76, 125, 255, 0.4);
  }

  .people-card__avatar {
    width: 72px;
    height: 72px;
    border-radius: 12px;
    overflow: hidden;
    background-color: #f2f4f8;
  }

  .people-card__avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .people-card__mask {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.45);
    color: #ffffff;
    font-size: 12px;
  }

  .people-card__footer {
    width: 100%;
    margin-top: 6px;
    display: flex;
    align-items: center;
  }

  .people-card__name {
    flex: 1;
    font-size: 12px;
    color: #3b4256;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .people-card__menu {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .people-card__menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    background-color: rgba(255, 255, 255, 0.85);
    color: #7a8198;
    font-size: 14px;
    cursor: pointer;
  }

  .people-card__menu-btn:hover {
    background-color: #eef1f8;
  }
</style>
