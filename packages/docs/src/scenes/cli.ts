import { canSendFollowUp } from './resolveSceneId';
import { DEFAULT_SCENE_ID, MAX_FOLLOW_UPS } from './constants';
import { resolveSceneId } from './resolveSceneId';

/**
 * @param name 用例名
 * @param ok 是否通过
 */
function check(name: string, ok: boolean): boolean {
  if (!ok) console.error(`[scenes] FAIL ${name}`);
  else console.log(`[scenes] ok ${name}`);
  return ok;
}

let passed = true;
passed = check('default assistant', resolveSceneId(undefined) === DEFAULT_SCENE_ID) && passed;
passed = check('valid sop', resolveSceneId('sop') === 'sop') && passed;
passed = check('invalid fallback', resolveSceneId('gfm') === DEFAULT_SCENE_ID) && passed;
passed = check('third follow-up allowed', canSendFollowUp(2) === true) && passed;
passed = check('fourth blocked', canSendFollowUp(MAX_FOLLOW_UPS) === false) && passed;

process.exit(passed ? 0 : 1);
