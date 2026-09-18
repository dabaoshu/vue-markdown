import type { MarkdownFeatures } from '@nnnb/markdown-ui';
import type { SceneId } from './constants';

const OFF: MarkdownFeatures = {
  gfm: false,
  breaks: false,
  math: false,
  mermaid: false,
  think: false,
  customTags: false,
  codeHighlight: false,
  elTable: false,
  httpResource: false
};

const TABLE: Record<SceneId, MarkdownFeatures> = {
  assistant: { ...OFF, gfm: true, breaks: true, think: true, mermaid: true, httpResource: true },
  sop: { ...OFF, gfm: true, breaks: true, mermaid: true, elTable: true, httpResource: true },
  postmortem: {
    ...OFF,
    gfm: true,
    breaks: true,
    codeHighlight: true,
    mermaid: true,
    elTable: true,
    httpResource: true,
    math: true
  },
  reasoning: { ...OFF, gfm: true, breaks: true, think: true },
  attachments: { ...OFF, gfm: true, breaks: true, httpResource: true },
  intake: { ...OFF, gfm: true, breaks: true },
  capacity: { ...OFF, gfm: true, breaks: true, math: true }
};

/**
 * 返回场景写死的特性副本，避免调用方改到表。
 *
 * @param id 场景 id
 */
export function getSceneFeatures(id: SceneId): MarkdownFeatures {
  return { ...TABLE[id] };
}
