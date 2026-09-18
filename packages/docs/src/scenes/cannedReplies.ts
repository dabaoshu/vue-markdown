import type { SceneId } from './constants';

interface ReplyBank {
  mfa: string;
  outage: string;
  fallback: string;
}

const ASSISTANT: ReplyBank = {
  mfa: `<think>\n换机后旧令牌失效，和 MFA_REJECT 对得上。\n</think>\n\n请在员工中心 → 安全 → 重置 MFA。完成后用新手机关联。不必升级支付通道。`,
  outage: `<think>\n用户提到超时/支付，但当前探针仍绿。\n</think>\n\n\`checkout-api\` 与通道正常。若是下单 504，把时间点和订单号发我；登录问题仍走 MFA。`,
  fallback: `我需要更多线索。请发手机号后四位，或直接报工单号 \`INC-20260918-0142\`。`
};

const REASONING: ReplyBank = {
  mfa: `<think>\n换机 → MFA 失效。\n</think>\n重置 MFA 即可。`,
  outage: `<think>\n不是通道事故。\n</think>\n登录问题不要升支付值班。`,
  fallback: `<think>\n信息不够。\n</think>\n请给后四位或工单号。`
};

/**
 * 按场景和用户输入挑选预制 Markdown 回复。
 *
 * @param sceneId 仅 `assistant` / `reasoning` 有完整词库；其它 id 使用 assistant 词库以免误调用抛错
 * @param userText 用户输入
 */
export function pickCannedReply(sceneId: SceneId, userText: string): string {
  const bank = sceneId === 'reasoning' ? REASONING : ASSISTANT;
  if (/手机|换机|MFA/i.test(userText)) return bank.mfa;
  if (/超时|5xx|支付/.test(userText)) return bank.outage;
  return bank.fallback;
}
