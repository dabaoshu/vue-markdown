import type { AttachmentPreviewModel } from './types';

/** 构建附件预览模型的输入参数 */
export interface AttachmentPreviewInput {
  kind: string;
  ext: string;
  href: string;
  title: string;
  imageFailed?: boolean;
}

/**
 * 将附件元数据映射为预览模型。
 * kind 为空（trim 后）时返回 null，表示无标记、不拦截。
 */
export function buildAttachmentPreview(
  input: AttachmentPreviewInput
): AttachmentPreviewModel | null {
  const kind = input.kind.trim();

  if (!kind) {
    return null;
  }

  if (kind === 'image') {
    return {
      mode: 'image',
      src: input.href,
      alt: input.title,
      failed: Boolean(input.imageFailed),
    };
  }

  return {
    mode: 'file',
    href: input.href,
    title: input.title,
    kind,
    ext: input.ext,
  };
}
