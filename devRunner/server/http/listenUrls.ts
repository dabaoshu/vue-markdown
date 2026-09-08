import os from 'node:os';

/**
 * 本机可用于访问的 IPv4（含 127.0.0.1 与所有非内部网卡）
 */
export function listIPv4Addresses(): string[] {
  const ips = new Set<string>(['127.0.0.1']);
  const nics = os.networkInterfaces();
  for (const addrs of Object.values(nics)) {
    if (!addrs) {
      continue;
    }
    for (const addr of addrs) {
      const family = String(addr.family);
      if ((family === 'IPv4' || family === '4') && addr.address) {
        ips.add(addr.address);
      }
    }
  }
  return [...ips];
}

/**
 * 控制台监听地址文案（localhost + 全部 IPv4）
 * @param port 端口
 */
export function listListenUrls(port: number): string[] {
  const hosts = ['localhost', ...listIPv4Addresses().filter((ip) => ip !== '127.0.0.1')];
  return hosts.map((host) => `http://${host}:${port}`);
}
