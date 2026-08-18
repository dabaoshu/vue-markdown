import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { checkoutBranch, getGitInfo } from './gitService.js';
import { listListenUrls } from './listenUrls.js';
import { logResolvedPaths, getWebDir } from './paths.js';
import { ProcessManager } from './processManager.js';
import type { RunnerEvent } from './types.js';
import { loadUserJump, saveUserJump, type UserJumpProfile } from './userJumpStore.js';
import { WEB_ASSETS } from './webAssets.js';
import { MiniWebSocket, MiniWebSocketServer, WS_OPEN } from './wsMini.js';

const PORT = Number(process.env.DEV_RUNNER_PORT || 8787);

const manager = new ProcessManager();

/**
 * MIME 类型映射
 */
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * 发送 JSON 响应
 */
function sendJson(
  res: http.ServerResponse,
  status: number,
  body: unknown
): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data)
  });
  res.end(data);
}

/**
 * 读取请求 body（JSON）
 */
async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * 静态文件托管：磁盘 web/（含 dist/web）> 内嵌资源
 */
function serveStatic(
  req: http.IncomingMessage,
  res: http.ServerResponse
): void {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') {
    pathname = '/index.html';
  }
  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }

  const webDir = getWebDir();
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(webDir, safePath);
  const resolvedWeb = path.resolve(webDir);
  if (filePath.startsWith(resolvedWeb) && fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream'
    });
    res.end(data);
    return;
  }

  const embedded = WEB_ASSETS[pathname];
  if (embedded) {
    const body = Buffer.from(embedded.body, 'utf8');
    res.writeHead(200, {
      'Content-Type': embedded.contentType,
      'Content-Length': body.length
    });
    res.end(body);
    return;
  }

  res.writeHead(404).end('Not Found');
}

/**
 * 处理 /api 路由
 */
async function handleApi(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  try {
    if (method === 'GET' && pathname === '/api/user-jump') {
      sendJson(res, 200, { profiles: loadUserJump() });
      return;
    }

    if (method === 'PUT' && pathname === '/api/user-jump') {
      const raw = await readBody(req).catch(() => '');
      let body: { profiles?: unknown } = {};
      try {
        body = raw ? (JSON.parse(raw) as { profiles?: unknown }) : {};
      } catch {
        sendJson(res, 400, { error: '无效的 JSON body' });
        return;
      }
      if (!Array.isArray(body.profiles)) {
        sendJson(res, 400, { error: '缺少 profiles 数组' });
        return;
      }
      const profiles = saveUserJump(body.profiles as UserJumpProfile[]);
      sendJson(res, 200, { profiles });
      return;
    }

    if (method === 'GET' && pathname === '/api/scripts') {
      sendJson(res, 200, {
        scripts: manager.listScripts(),
        target: manager.getTarget()
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/packages') {
      sendJson(res, 200, {
        packages: manager.listPackages(),
        target: manager.getTarget()
      });
      return;
    }

    if (method === 'POST' && pathname === '/api/target') {
      const raw = await readBody(req).catch(() => '');
      let body: { dir?: string; package?: string; path?: string; id?: string } =
        {};
      try {
        body = raw
          ? (JSON.parse(raw) as {
              dir?: string;
              package?: string;
              path?: string;
              id?: string;
            })
          : {};
      } catch {
        sendJson(res, 400, { error: '无效的 JSON body' });
        return;
      }
      const dir = (body.path || body.dir || body.package || body.id || '').trim();
      if (!dir) {
        sendJson(res, 400, {
          error: '缺少 path/dir（本仓库目录名或外部工程绝对路径）'
        });
        return;
      }
      const result = await manager.setTarget(dir);
      sendJson(res, 200, result);
      return;
    }

    if (method === 'POST' && pathname === '/api/packages/external') {
      const raw = await readBody(req).catch(() => '');
      let body: { path?: string; label?: string } = {};
      try {
        body = raw ? (JSON.parse(raw) as { path?: string; label?: string }) : {};
      } catch {
        sendJson(res, 400, { error: '无效的 JSON body' });
        return;
      }
      const inputPath = body.path?.trim();
      if (!inputPath) {
        sendJson(res, 400, { error: '缺少 path（外部工程绝对路径）' });
        return;
      }
      const added = manager.addExternalPackage(inputPath, body.label);
      sendJson(res, 200, {
        package: added,
        packages: manager.listPackages(),
        target: manager.getTarget()
      });
      return;
    }

    if (method === 'DELETE' && pathname === '/api/packages/external') {
      const raw = await readBody(req).catch(() => '');
      let body: { path?: string } = {};
      try {
        body = raw ? (JSON.parse(raw) as { path?: string }) : {};
      } catch {
        sendJson(res, 400, { error: '无效的 JSON body' });
        return;
      }
      const inputPath = body.path?.trim();
      if (!inputPath) {
        sendJson(res, 400, { error: '缺少 path' });
        return;
      }
      const packages = await manager.removeExternalPackage(inputPath);
      sendJson(res, 200, {
        packages,
        target: manager.getTarget()
      });
      return;
    }

    if (method === 'GET' && pathname === '/api/git') {
      const git = await getGitInfo();
      sendJson(res, 200, { git });
      return;
    }

    if (method === 'POST' && pathname === '/api/git/checkout') {
      const raw = await readBody(req).catch(() => '');
      let body: { branch?: string } = {};
      try {
        body = raw ? (JSON.parse(raw) as { branch?: string }) : {};
      } catch {
        sendJson(res, 400, { error: '无效的 JSON body' });
        return;
      }
      const branch = body.branch?.trim();
      if (!branch) {
        sendJson(res, 400, { error: '缺少 branch' });
        return;
      }

      // 切换分支前若有脚本在跑，先全部停止，避免新旧代码混跑
      const running = manager
        .listScripts()
        .filter((s) => s.status === 'running');
      if (running.length > 0) {
        await manager.stopAll();
      }

      const git = await checkoutBranch(branch);
      sendJson(res, 200, {
        git,
        stoppedScripts: running.map((s) => s.name)
      });
      return;
    }

    const match = pathname.match(
      /^\/api\/scripts\/([^/]+)\/(start|stop|restart|clear-logs)$/
    );
    if (match && method === 'POST') {
      const name = decodeURIComponent(match[1]);
      const action = match[2];

      // 消费 body（即使不用），避免客户端挂起
      await readBody(req).catch(() => '');

      type ScriptAction = 'start' | 'stop' | 'restart' | 'clear-logs';
      const scriptAction = action as ScriptAction;
      let runtime;
      switch (scriptAction) {
        case 'start':
          runtime = await manager.start(name);
          break;
        case 'stop':
          runtime = await manager.stop(name);
          break;
        case 'restart':
          runtime = await manager.restart(name);
          break;
        case 'clear-logs':
          manager.clearLogs(name);
          runtime = manager.listScripts().find((s) => s.name === name);
          break;
        default: {
          const _exhaustive: never = scriptAction;
          throw new Error(`未处理的动作: ${String(_exhaustive)}`);
        }
      }
      sendJson(res, 200, { script: runtime });
      return;
    }

    sendJson(res, 404, { error: 'Not Found' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const statusCode =
      err && typeof err === 'object' && 'statusCode' in err
        ? Number((err as { statusCode: number }).statusCode)
        : 500;
    console.error('[api]', message);
    sendJson(res, statusCode || 500, { error: message });
  }
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  if (url.startsWith('/api/')) {
    void handleApi(req, res);
    return;
  }
  serveStatic(req, res);
});

const wss = new MiniWebSocketServer({ server, path: '/ws' });

/**
 * 向单个 WS 客户端发送事件
 */
function sendEvent(ws: MiniWebSocket, event: RunnerEvent): void {
  if (ws.readyState !== WS_OPEN) {
    return;
  }
  try {
    ws.send(JSON.stringify(event));
  } catch (err) {
    console.warn('[dev-runner] WS 发送失败', err);
  }
}

wss.on('connection', (ws) => {
  // 连接时发送全量快照 + 各脚本日志回放
  sendEvent(ws, {
    type: 'snapshot',
    scripts: manager.listScripts(),
    target: manager.getTarget(),
    ts: Date.now()
  });

  for (const script of manager.listScripts()) {
    for (const line of manager.getLogs(script.name)) {
      sendEvent(ws, {
        type: 'log',
        script: script.name,
        stream: line.stream,
        text: line.text,
        ts: line.ts
      });
    }
  }

  const unsubscribe = manager.subscribe((event) => {
    sendEvent(ws, event);
  });

  ws.on('close', () => {
    unsubscribe();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const urls = listListenUrls(PORT);
  console.log(`[dev-runner] 控制台已启动:`);
  for (const url of urls) {
    console.log(`  ${url}`);
  }
  console.log(`[dev-runner] 目标包: ${manager.getTarget().relativePath} (${manager.getTarget().name})`);
  logResolvedPaths();
});

/**
 * 优雅退出：清理所有子进程
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`\n[dev-runner] 收到 ${signal}，正在清理子进程...`);
  try {
    await manager.stopAll();
  } catch (err) {
    console.error('[dev-runner] 清理失败', err);
  }
  wss.close();
  server.close(() => {
    process.exit(0);
  });
  // 兜底超时强制退出
  setTimeout(() => process.exit(1), 3000).unref();
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
