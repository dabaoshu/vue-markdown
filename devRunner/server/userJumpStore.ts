import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getStateDir } from './paths.js';

/**
 * 用户跳转角色配置
 */
export interface UserJumpProfile {
  id: string;
  role: string;
  host: string;
  port: number;
  accessToken: string;
}

/**
 * 默认两行示例
 */
function defaultProfiles(): UserJumpProfile[] {
  return [
    {
      id: 'p_admin',
      role: '管理员',
      host: 'localhost',
      port: 5173,
      accessToken: 'adsasa'
    },
    {
      id: 'p_teacher',
      role: '老师',
      host: 'localhost',
      port: 8002,
      accessToken: 'teacher-token'
    }
  ];
}

/**
 * JSON 文件路径：状态目录下的 user-jump.json
 */
export function getUserJumpFile(): string {
  return path.join(getStateDir(), 'user-jump.json');
}

/**
 * 规范化一条配置
 * @param raw 原始对象
 */
function normalizeProfile(raw: unknown): UserJumpProfile | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const item = raw as Record<string, unknown>;
  const id = String(item.id || '').trim();
  const role = String(item.role || '').trim() || '未命名角色';
  const host = String(item.host || '').trim() || 'localhost';
  const port = Number(item.port) || 80;
  const accessToken = String(item.accessToken || '').trim();
  if (!id) {
    return null;
  }
  return { id, role, host, port, accessToken };
}

/**
 * 读取用户跳转列表
 */
export function loadUserJump(): UserJumpProfile[] {
  const filePath = getUserJumpFile();
  if (!existsSync(filePath)) {
    const initial = defaultProfiles();
    saveUserJump(initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { profiles?: unknown }).profiles)
        ? (parsed as { profiles: unknown[] }).profiles
        : [];
    const profiles = list
      .map((item) => normalizeProfile(item))
      .filter((item): item is UserJumpProfile => Boolean(item));
    return profiles.length > 0 ? profiles : defaultProfiles();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[dev-runner] 读取 user-jump.json 失败:', message);
    return defaultProfiles();
  }
}

/**
 * 写入用户跳转列表
 * @param profiles 角色列表
 */
export function saveUserJump(profiles: UserJumpProfile[]): UserJumpProfile[] {
  const normalized = profiles
    .map((item) => normalizeProfile(item))
    .filter((item): item is UserJumpProfile => Boolean(item));
  if (normalized.length === 0) {
    const err = new Error('至少保留一条用户跳转配置');
    (err as Error & { statusCode: number }).statusCode = 400;
    throw err;
  }
  const dir = getStateDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const payload = {
    profiles: normalized,
    updatedAt: new Date().toISOString()
  };
  writeFileSync(getUserJumpFile(), JSON.stringify(payload, null, 2), 'utf8');
  return normalized;
}
