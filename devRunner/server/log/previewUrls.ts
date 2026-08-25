/** 匹配 Vite Local / Network 等 http(s) 地址 */
export const HTTP_URL_RE =
  /https?:\/\/(?:\[[^\]]+\]|localhost|[\w.-]+|\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?/gi;

/**
 * 从日志文本中提取 http(s) URL 与端口
 * @param text 日志片段
 */
export function collectHttpUrlsFromLog(text: string): {
  urls: string[];
  port: number | null;
} {
  HTTP_URL_RE.lastIndex = 0;
  const urls: string[] = [];
  let port: number | null = null;
  let match: RegExpExecArray | null;
  while ((match = HTTP_URL_RE.exec(text)) !== null) {
    const full = match[0].replace(/\/$/, '');
    const portStr = match[1];
    let nextPort = portStr
      ? Number(portStr)
      : full.startsWith('https://')
        ? 443
        : 80;
    if (!Number.isFinite(nextPort) || nextPort < 1) {
      continue;
    }
    if (nextPort < 1024 && nextPort !== 80 && nextPort !== 443) {
      continue;
    }
    urls.push(full);
    port = nextPort;
  }
  return { urls, port };
}

/**
 * 合并已有预览地址，并补全 localhost + 本机 IPv4
 * @param existing 已有地址
 * @param found 新发现地址
 * @param port 端口
 * @param ipv4s 本机 IPv4 列表
 */
export function mergePreviewUrls(
  existing: string[],
  found: string[],
  port: number | null,
  ipv4s: string[]
): { previewUrl: string | null; previewUrls: string[]; port: number | null } {
  if (found.length === 0) {
    return {
      previewUrl: existing[0]
        ? existing.find((u) => u.includes('localhost')) || existing[0]
        : null,
      previewUrls: [...existing],
      port
    };
  }

  const urls = new Set<string>([...existing, ...found]);
  if (port) {
    const proto = found[0]?.startsWith('https://') ? 'https' : 'http';
    urls.add(`${proto}://localhost:${port}`);
    for (const ip of ipv4s) {
      urls.add(`${proto}://${ip}:${port}`);
    }
  }

  const list = [...urls];
  const preferred =
    list.find((u) => u.includes('localhost')) || list[0] || null;
  return {
    previewUrl: preferred,
    previewUrls: list,
    port
  };
}
