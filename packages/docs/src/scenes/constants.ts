export const SCENE_IDS = [
  'assistant',
  'sop',
  'postmortem',
  'reasoning',
  'attachments',
  'intake',
  'capacity'
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

export const DEFAULT_SCENE_ID: SceneId = 'assistant';

export const TICKET_ID = 'INC-20260918-0142';

export const MAX_FOLLOW_UPS = 3;

export const FOLLOW_UP_DELAY_MS = 400;

/** 对话流式：每次追加的最小字符数 */
export const STREAM_CHUNK_MIN = 2;

/** 对话流式：每次追加的最大字符数 */
export const STREAM_CHUNK_MAX = 8;

/** 对话流式：两块之间的间隔（毫秒） */
export const STREAM_INTERVAL_MS = 48;
