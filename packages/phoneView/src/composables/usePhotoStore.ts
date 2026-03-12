import { computed, reactive, toRefs } from 'vue';
import type { Ref } from 'vue';
import dayjs from 'dayjs';
import {
  createDefaultPhotoParams,
  type PhotoItem,
  type PhotoParams,
  type PhotoPresetId,
  type PhotoState
} from '@/types/photo';

let photoStore: ReturnType<typeof createPhotoStore> | null = null;

/**
 * 创建内部 photo store 对象
 *
 * @returns {object} 证件照内部状态与操作方法
 */
function createPhotoStore() {
  const state = reactive<PhotoState>({
    step: 1,
    currentPhotoId: null,
    items: [],
    currentParams: createDefaultPhotoParams()
  });

  /**
   * 按 id 查找照片
   *
   * @param {string} id 照片 id
   * @returns {PhotoItem | undefined} 照片对象
   */
  function findPhotoById(id: string): PhotoItem | undefined {
    return state.items.find((item) => item.id === id);
  }

  /**
   * 新增一张照片记录
   *
   * @param {File | null} file 原始文件
   * @param {string} originalUrl 原始预览地址
   * @returns {PhotoItem} 新增后的照片对象
   */
  function addPhoto(file: File | null, originalUrl: string): PhotoItem {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: PhotoItem = {
      id,
      file,
      originalUrl,
      croppedUrl: originalUrl,
      createdAt: dayjs().toISOString(),
      params: { ...state.currentParams },
      selected: true
    };

    state.items.push(item);
    state.currentPhotoId = id;

    return item;
  }

  /**
   * 更新当前公共参数，并可选择同步到已选中的照片
   *
   * @param {Partial<PhotoParams>} patch 要更新的字段
   * @param {boolean} applyToSelected 是否同步到已选中的照片
   * @returns {void}
   */
  function updateParams(patch: Partial<PhotoParams>, applyToSelected = false): void {
    state.currentParams = {
      ...state.currentParams,
      ...patch
    };

    if (applyToSelected) {
      state.items.forEach((item) => {
        if (item.selected) {
          item.params = {
            ...item.params,
            ...patch
          };
        }
      });
    }
  }

  /**
   * 变更当前规格预设
   *
   * @param {PhotoPresetId} presetId 预设 id
   * @param {number} widthMm 宽度（毫米）
   * @param {number} heightMm 高度（毫米）
   * @returns {void}
   */
  function changePreset(presetId: PhotoPresetId, widthMm: number, heightMm: number): void {
    updateParams(
      {
        presetId,
        widthMm,
        heightMm
      },
      true
    );
  }

  /**
   * 设置当前正在编辑的照片
   *
   * @param {string | null} id 照片 id
   * @returns {void}
   */
  function setCurrentPhoto(id: string | null): void {
    state.currentPhotoId = id;
  }

  /**
   * 更新指定照片的裁剪结果地址
   *
   * @param {string} id 照片 id
   * @param {string} croppedUrl 裁剪后预览地址
   * @returns {void}
   */
  function updateCroppedUrl(id: string, croppedUrl: string): void {
    const item = findPhotoById(id);
    if (item) {
      item.croppedUrl = croppedUrl;
    }
  }

  /**
   * 删除指定照片
   *
   * @param {string} id 照片 id
   * @returns {void}
   */
  function removePhoto(id: string): void {
    const index = state.items.findIndex((item) => item.id === id);
    if (index !== -1) {
      const [removed] = state.items.splice(index, 1);
      if (removed && removed.file && removed.originalUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removed.originalUrl);
      }
    }

    if (state.currentPhotoId === id) {
      state.currentPhotoId = state.items.length ? state.items[0].id : null;
    }
  }

  /**
   * 切换照片勾选状态
   *
   * @param {string} id 照片 id
   * @param {boolean} selected 是否选中
   * @returns {void}
   */
  function setPhotoSelected(id: string, selected: boolean): void {
    const item = findPhotoById(id);
    if (item) {
      item.selected = selected;
    }
  }

  /**
   * 设置流程步骤
   *
   * @param {number} step 新的步骤值
   * @returns {void}
   */
  function setStep(step: number): void {
    state.step = step;
  }

  const currentPhoto = computed<PhotoItem | null>(() => {
    if (!state.currentPhotoId) {
      return null;
    }
    return findPhotoById(state.currentPhotoId) ?? null;
  });

  const selectedPhotos = computed<PhotoItem[]>(() => state.items.filter((item) => item.selected));

  return {
    ...toRefs(state),
    currentPhoto,
    selectedPhotos,
    addPhoto,
    updateParams,
    changePreset,
    setCurrentPhoto,
    updateCroppedUrl,
    removePhoto,
    setPhotoSelected,
    setStep
  };
}

/**
 * 使用证件照状态 store。
 * 该函数在整个应用内返回同一份响应式状态。
 *
 * @returns {ReturnType<typeof createPhotoStore>} store 实例
 */
export function usePhotoStore(): ReturnType<typeof createPhotoStore> {
  if (!photoStore) {
    photoStore = createPhotoStore();
  }
  return photoStore;
}

export type UsePhotoStoreReturn = ReturnType<typeof createPhotoStore>;

