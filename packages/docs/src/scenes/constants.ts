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
