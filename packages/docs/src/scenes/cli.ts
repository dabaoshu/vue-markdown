import { buildAttachmentPreview } from './attachmentPreviewModel';
import { pickCannedReply } from './cannedReplies';
import { canSendFollowUp } from './resolveSceneId';
import { DEFAULT_SCENE_ID, MAX_FOLLOW_UPS } from './constants';
import { createEmptyIntakeForm, validateIntakeForm } from './intakeValidation';
import { resolveSceneId } from './resolveSceneId';
import { getScene, sceneList } from './sceneData';
import { getSceneFeatures } from './sceneFeatures';

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
passed =
  check('seven scenes', sceneList.length === 7) && passed;
passed =
  check(
    'assistant description',
    getScene('assistant').description ===
      '一条完整的运维助手回复：思考、步骤、流程图与附件；可再问一句'
  ) && passed;
passed =
  check('assistant think on', getSceneFeatures('assistant').think === true) &&
  passed;
passed =
  check('reasoning mermaid off', getSceneFeatures('reasoning').mermaid === false) &&
  passed;
passed =
  check('intake no form json', getScene('intake').markdown.includes(':::form') === false) &&
  passed;
passed =
  check('assistant has think tag', getScene('assistant').markdown.includes('<think>') === true) &&
  passed;
passed =
  check('mfa keyword', pickCannedReply('assistant', '我换手机了').includes('重置')) &&
  passed;
passed =
  check('outage keyword', pickCannedReply('assistant', '订单超时了').includes('checkout-api')) &&
  passed;
passed =
  check(
    'fallback',
    pickCannedReply('assistant', '你好').includes('后四位') ||
      pickCannedReply('assistant', '你好').includes('工单号')
  ) && passed;
passed =
  check('reasoning still think', pickCannedReply('reasoning', '为什么').includes('<think>')) &&
  passed;

const empty = createEmptyIntakeForm();
passed = check('default satisfaction', empty.satisfaction === 60) && passed;
passed =
  check('name required', validateIntakeForm(empty).ok === false) && passed;
passed =
  check(
    'urgent reason',
    validateIntakeForm({ ...empty, name: '李', urgent: true, reason: '' }).ok === false
  ) && passed;
passed =
  check(
    'non-urgent ok',
    validateIntakeForm({ ...empty, name: '李', urgent: false }).ok === true
  ) && passed;
passed =
  check('unmarked skip', buildAttachmentPreview({ kind: '', ext: '', href: './a.png', title: 'x' }) === null) &&
  passed;
passed =
  check(
    'failed image lightbox',
    buildAttachmentPreview({
      kind: 'image',
      ext: 'png',
      href: 'https://example.com/x.png',
      title: 'x',
      imageFailed: true
    })?.mode === 'image'
  ) && passed;
passed =
  check(
    'failed image flag',
    buildAttachmentPreview({
      kind: 'image',
      ext: 'png',
      href: 'https://example.com/x.png',
      title: 'x',
      imageFailed: true
    })?.failed === true
  ) && passed;

process.exit(passed ? 0 : 1);
