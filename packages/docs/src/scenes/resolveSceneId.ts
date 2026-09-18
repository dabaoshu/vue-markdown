import {
  DEFAULT_SCENE_ID,
  MAX_FOLLOW_UPS,
  SCENE_IDS,
  type SceneId
} from './constants';

const SCENE_ID_SET = new Set<string>(SCENE_IDS);

/**
 * 把 URL query.tab 收成合法 SceneId。
 *
 * @param raw `route.query.tab`
 * @returns 非法或缺失时返回 `assistant`
 */
export function resolveSceneId(raw: unknown): SceneId {
  const id = typeof raw === 'string' ? raw : DEFAULT_SCENE_ID;
  return SCENE_ID_SET.has(id) ? (id as SceneId) : DEFAULT_SCENE_ID;
}

/**
 * 已发送追问次数是否仍允许再发。
 *
 * @param sentCount 已经成功发出的用户追问条数（不含初始助手消息）
 */
export function canSendFollowUp(sentCount: number): boolean {
  return sentCount < MAX_FOLLOW_UPS;
}
