import { createHash } from 'node:crypto';
import type http from 'node:http';
import type { Duplex } from 'node:stream';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/** WebSocket OPEN */
export const WS_OPEN = 1;

/**
 * 服务端出站文本帧（不掩码）
 * @param payload 文本
 * @param opcode 帧类型
 */
function encodeFrame(payload: Buffer, opcode: number): Buffer {
  const len = payload.length;
  let header: Buffer;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

/**
 * 解析客户端入站帧（带掩码）
 * @param buf 缓冲
 */
function decodeFrames(buf: Buffer): {
  rest: Buffer;
  texts: string[];
  pings: Buffer[];
  closed: boolean;
} {
  const texts: string[] = [];
  const pings: Buffer[] = [];
  let closed = false;
  let offset = 0;

  while (offset + 2 <= buf.length) {
    const b0 = buf[offset];
    const b1 = buf[offset + 1];
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let payloadLen = b1 & 0x7f;
    let headerLen = 2;
    if (payloadLen === 126) {
      if (offset + 4 > buf.length) {
        break;
      }
      payloadLen = buf.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buf.length) {
        break;
      }
      const big = buf.readBigUInt64BE(offset + 2);
      payloadLen = Number(big);
      headerLen = 10;
    }
    const maskLen = masked ? 4 : 0;
    const frameLen = headerLen + maskLen + payloadLen;
    if (offset + frameLen > buf.length) {
      break;
    }

    let payload = buf.subarray(
      offset + headerLen + maskLen,
      offset + frameLen
    );
    if (masked) {
      const mask = buf.subarray(offset + headerLen, offset + headerLen + 4);
      const copy = Buffer.from(payload);
      for (let i = 0; i < copy.length; i++) {
        copy[i] ^= mask[i % 4];
      }
      payload = copy;
    }

    if (opcode === 0x1) {
      texts.push(payload.toString('utf8'));
    } else if (opcode === 0x8) {
      closed = true;
    } else if (opcode === 0x9) {
      pings.push(payload);
    }

    offset += frameLen;
  }

  return { rest: buf.subarray(offset), texts, pings, closed };
}

/**
 * 单个 WebSocket 连接（仅文本，供控制台推送日志）
 */
export class MiniWebSocket {
  readonly OPEN = WS_OPEN;
  readyState = WS_OPEN;

  private readonly socket: Duplex;
  private readonly closeListeners: Array<() => void> = [];
  private buf = Buffer.alloc(0);

  constructor(socket: Duplex) {
    this.socket = socket;
    socket.on('data', (chunk: Buffer) => {
      this.buf = Buffer.concat([this.buf, Buffer.from(chunk)]);
      const parsed = decodeFrames(this.buf);
      this.buf = Buffer.from(parsed.rest);
      for (const ping of parsed.pings) {
        this.socket.write(encodeFrame(ping, 0xa));
      }
      if (parsed.closed) {
        this.close();
      }
    });
    socket.on('close', () => {
      this.readyState = 3;
      this.emitClose();
    });
    socket.on('error', () => {
      this.close();
    });
  }

  /**
   * 发送文本
   * @param data JSON 字符串
   */
  send(data: string): void {
    if (this.readyState !== WS_OPEN) {
      return;
    }
    this.socket.write(encodeFrame(Buffer.from(data, 'utf8'), 0x1));
  }

  /**
   * 订阅事件（目前只用 close）
   * @param event 事件名
   * @param listener 回调
   */
  on(event: 'close', listener: () => void): void {
    if (event === 'close') {
      this.closeListeners.push(listener);
    }
  }

  /**
   * 关闭连接
   */
  close(): void {
    if (this.readyState !== WS_OPEN) {
      return;
    }
    this.readyState = 3;
    try {
      this.socket.write(encodeFrame(Buffer.alloc(0), 0x8));
      this.socket.end();
    } catch {
      // 忽略已断开
    }
    this.emitClose();
  }

  private emitClose(): void {
    const list = this.closeListeners.splice(0);
    for (const fn of list) {
      fn();
    }
  }
}

/**
 * 挂在已有 http.Server 上的简易 WebSocket 服务
 */
export class MiniWebSocketServer {
  private readonly clients = new Set<MiniWebSocket>();
  private readonly connectionListeners: Array<(ws: MiniWebSocket) => void> =
    [];

  /**
   * @param options.server HTTP 服务
   * @param options.path 升级路径，如 /ws
   */
  constructor(options: { server: http.Server; path: string }) {
    options.server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      if (url.pathname !== options.path) {
        socket.destroy();
        return;
      }
      const key = req.headers['sec-websocket-key'];
      if (!key || String(req.headers.upgrade || '').toLowerCase() !== 'websocket') {
        socket.destroy();
        return;
      }
      const accept = createHash('sha1').update(key + GUID).digest('base64');
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
      );
      if (head.length > 0) {
        socket.unshift(head);
      }
      const ws = new MiniWebSocket(socket);
      this.clients.add(ws);
      ws.on('close', () => {
        this.clients.delete(ws);
      });
      for (const listener of this.connectionListeners) {
        listener(ws);
      }
    });
  }

  /**
   * 新连接
   * @param event 固定 connection
   * @param listener 回调
   */
  on(event: 'connection', listener: (ws: MiniWebSocket) => void): void {
    if (event === 'connection') {
      this.connectionListeners.push(listener);
    }
  }

  /**
   * 关闭全部连接
   */
  close(): void {
    for (const ws of this.clients) {
      ws.close();
    }
    this.clients.clear();
  }
}
