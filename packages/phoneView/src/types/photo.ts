export type PhotoPresetId = '1inch' | '2inch' | 'custom';

export type PhotoLayoutMode = 'single' | 'grid';

export type PhotoBackgroundColor = 'white' | 'blue' | 'red' | string;

/**
 * 证件照生成参数
 *
 * @public
 */
export interface PhotoParams {
  /**
   * 规格预设标识，例如 1 寸、2 寸或自定义
   */
  presetId: PhotoPresetId;
  /**
   * 照片宽度（单位：毫米）
   */
  widthMm: number;
  /**
   * 照片高度（单位：毫米）
   */
  heightMm: number;
  /**
   * 分辨率（单位：dpi）
   */
  dpi: number;
  /**
   * 背景颜色
   */
  backgroundColor: PhotoBackgroundColor;
  /**
   * 上边距（单位：毫米）
   */
  paddingTopMm: number;
  /**
   * 下边距（单位：毫米）
   */
  paddingBottomMm: number;
  /**
   * 生成数量
   */
  copies: number;
  /**
   * 排版方式：单张或网格排版
   */
  layout: PhotoLayoutMode;
}

/**
 * 单张证件照数据
 *
 * @public
 */
export interface PhotoItem {
  /**
   * 唯一标识
   */
  id: string;
  /**
   * 原始图片文件
   */
  file: File | null;
  /**
   * 原始图片本地预览地址
   */
  originalUrl: string;
  /**
   * 裁剪后图片预览地址
   */
  croppedUrl: string;
  /**
   * 创建时间 ISO 字符串
   */
  createdAt: string;
  /**
   * 当前使用的生成参数快照
   */
  params: PhotoParams;
  /**
   * 是否被勾选用于批量导出
   */
  selected: boolean;
  /**
   * 用户填写的名称（如姓名）
   */
  name?: string;
}

/**
 * 证件照状态结构
 *
 * @public
 */
export interface PhotoState {
  /**
   * 当前流程步骤，从 1 开始
   */
  step: number;
  /**
   * 当前正在编辑的照片 id
   */
  currentPhotoId: string | null;
  /**
   * 所有已上传照片列表
   */
  items: PhotoItem[];
  /**
    * 当前公共参数配置
    */
  currentParams: PhotoParams;
}

/**
 * 规格预设配置
 *
 * @public
 */
export interface PhotoPreset {
  id: PhotoPresetId;
  label: string;
  description: string;
  widthMm: number;
  heightMm: number;
}

export const PHOTO_PRESETS: PhotoPreset[] = [
  {
    id: '1inch',
    label: '一寸照',
    description: '25mm × 35mm，常见入学报名',
    widthMm: 25,
    heightMm: 35
  },
  {
    id: '2inch',
    label: '二寸照',
    description: '35mm × 49mm，常见考试报名',
    widthMm: 35,
    heightMm: 49
  },
  {
    id: 'custom',
    label: '自定义',
    description: '手动输入尺寸',
    widthMm: 35,
    heightMm: 49
  }
];

/**
 * 创建默认参数配置
 *
 * @returns {PhotoParams} 默认参数对象
 */
export function createDefaultPhotoParams(): PhotoParams {
  return {
    presetId: '1inch',
    widthMm: 25,
    heightMm: 35,
    dpi: 300,
    backgroundColor: 'white',
    paddingTopMm: 2,
    paddingBottomMm: 2,
    copies: 4,
    layout: 'grid'
  };
}

