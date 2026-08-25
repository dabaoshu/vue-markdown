/**
 * 子进程管道日志解码：处理 Windows GBK、不完整多字节、ANSI 转义
 */

/**
 * 去掉终端颜色与控制序列（复制纯文本等场景使用）。
 * 同时处理完整 CSI/OSC 与 chunk 末尾截断的半截转义。
 * @param text 原始文本
 */
export function stripAnsi(text: string): string {
  let out = text;
  // CSI：ESC [ ... 最终字节
  out = out.replace(/\u001b\[[0-9;?=]*[@-~]/g, '');
  // 8-bit CSI（0x9b）
  out = out.replace(/\u009b[0-9;?=]*[@-~]/g, '');
  // OSC：ESC ] ... BEL 或 ST
  out = out.replace(/\u001b\][\s\S]*?(?:\u0007|\u001b\\)/g, '');
  // 其它两字符 ESC 序列
  out = out.replace(/\u001b[@-Z\\-_]/g, '');
  // chunk 边界残留的半截 ESC 序列（无最终字节）
  out = out.replace(/\u001b\[[0-9;?=]*$/g, '');
  out = out.replace(/\u009b[0-9;?=]*$/g, '');
  out = out.replace(/\u001b$/g, '');
  return out;
}

/**
 * 判断从 index 起是否为「可能未完成」的 ANSI 前缀，需留给下一 chunk
 * @param buf 缓冲
 * @param index 起始下标
 */
function incompleteAnsiLen(buf: Buffer, index: number): number {
  if (index >= buf.length) {
    return 0;
  }
  const b0 = buf[index];
  // ESC
  if (b0 === 0x1b) {
    if (index + 1 >= buf.length) {
      return 1;
    }
    const b1 = buf[index + 1];
    // CSI ESC [
    if (b1 === 0x5b /* [ */) {
      let i = index + 2;
      while (i < buf.length) {
        const c = buf[i];
        // 最终字节 @-~
        if (c >= 0x40 && c <= 0x7e) {
          return 0;
        }
        i += 1;
      }
      return buf.length - index;
    }
    // OSC ESC ]
    if (b1 === 0x5d /* ] */) {
      let i = index + 2;
      while (i < buf.length) {
        if (buf[i] === 0x07) {
          return 0;
        }
        if (buf[i] === 0x1b && i + 1 < buf.length && buf[i + 1] === 0x5c) {
          return 0;
        }
        i += 1;
      }
      return buf.length - index;
    }
    // 单字符 ESC 序列尚未到
    return 0;
  }
  // 8-bit CSI
  if (b0 === 0x9b) {
    let i = index + 1;
    while (i < buf.length) {
      const c = buf[i];
      if (c >= 0x40 && c <= 0x7e) {
        return 0;
      }
      i += 1;
    }
    return buf.length - index;
  }
  return 0;
}

/**
 * 计算应留到下一包的尾部字节（不完整 UTF-8 或多半截 ANSI）
 * @param buf 缓冲
 */
function trailingHoldLen(buf: Buffer): number {
  if (buf.length === 0) {
    return 0;
  }

  // 从末尾向前找可能的 ESC / CSI 起点
  for (let start = Math.max(0, buf.length - 32); start < buf.length; start++) {
    const hold = incompleteAnsiLen(buf, start);
    if (hold > 0 && start + hold === buf.length) {
      return hold;
    }
  }

  // 不完整 UTF-8 多字节尾部
  let i = buf.length - 1;
  let count = 0;
  while (i >= 0 && (buf[i] & 0xc0) === 0x80) {
    count += 1;
    i -= 1;
    if (count > 3) {
      return 0;
    }
  }
  if (i < 0) {
    return 0;
  }
  const lead = buf[i];
  let need = 1;
  if (lead >= 0xc2 && lead <= 0xdf) {
    need = 2;
  } else if (lead >= 0xe0 && lead <= 0xef) {
    need = 3;
  } else if (lead >= 0xf0 && lead <= 0xf4) {
    need = 4;
  } else {
    return 0;
  }
  const have = buf.length - i;
  if (have < need) {
    return have;
  }
  return 0;
}

/**
 * 判断 buffer 是否为合法 UTF-8（不含不完整尾部时）
 * @param buf 字节
 */
function isValidUtf8(buf: Buffer): boolean {
  let i = 0;
  while (i < buf.length) {
    const b = buf[i];
    let need = 0;
    if (b <= 0x7f) {
      need = 1;
    } else if (b >= 0xc2 && b <= 0xdf) {
      need = 2;
    } else if (b >= 0xe0 && b <= 0xef) {
      need = 3;
    } else if (b >= 0xf0 && b <= 0xf4) {
      need = 4;
    } else {
      return false;
    }
    if (i + need > buf.length) {
      return false;
    }
    for (let j = 1; j < need; j++) {
      if ((buf[i + j] & 0xc0) !== 0x80) {
        return false;
      }
    }
    i += need;
  }
  return true;
}

/**
 * 用 TextDecoder 按指定编码解码（依赖 Node ICU）
 * @param buf 字节
 * @param encoding 编码名
 */
function decodeWith(buf: Buffer, encoding: string): string | null {
  try {
    return new TextDecoder(encoding).decode(buf);
  } catch {
    return null;
  }
}

/**
 * 流式管道解码器：Windows 上自动在 UTF-8 / GBK 间选择；保留完整 ANSI 供前端着色
 */
export class PipeDecoder {
  private pending: Buffer = Buffer.alloc(0);

  /**
   * 解码一块 stdout/stderr 数据
   * @param chunk 原始字节
   */
  write(chunk: Buffer): string {
    const data =
      this.pending.length > 0
        ? Buffer.concat([this.pending, chunk])
        : Buffer.from(chunk);
    this.pending = Buffer.alloc(0);

    if (data.length === 0) {
      return '';
    }

    const hold = trailingHoldLen(data);
    let complete = data;
    if (hold > 0) {
      this.pending = Buffer.from(data.subarray(data.length - hold));
      complete = Buffer.from(data.subarray(0, data.length - hold));
    }

    if (complete.length === 0) {
      return '';
    }

    return this.decodeBytes(complete);
  }

  /**
   * 刷新残留字节
   */
  end(): string {
    if (this.pending.length === 0) {
      return '';
    }
    const left = this.pending;
    this.pending = Buffer.alloc(0);
    return this.decodeBytes(left);
  }

  /**
   * 将完整字节块解码为字符串
   * @param data 不含半截序列的缓冲
   */
  private decodeBytes(data: Buffer): string {
    if (process.platform === 'win32') {
      if (isValidUtf8(data)) {
        return data.toString('utf8');
      }
      return (
        decodeWith(data, 'gb18030') ??
        decodeWith(data, 'gbk') ??
        data.toString('utf8')
      );
    }
    return data.toString('utf8');
  }
}
