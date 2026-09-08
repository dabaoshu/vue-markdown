/** 日志环形缓冲最大行数（前后端对齐） */
export const MAX_LOG_LINES = 2000;

/**
 * 单条缓冲日志
 */
export interface LogLine {
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
  ts: number;
}

/**
 * 向环形缓冲追加一行，超出上限时从头部丢弃
 * @param lines 缓冲
 * @param entry 新日志
 * @param maxLines 上限
 */
export function pushLogLine(
  lines: LogLine[],
  entry: LogLine,
  maxLines: number = MAX_LOG_LINES
): LogLine[] {
  lines.push(entry);
  while (lines.length > maxLines) {
    lines.shift();
  }
  return lines;
}

/**
 * 截断日志列表至上限（用于前端本地缓冲）
 * @param lines 日志
 * @param maxLines 上限
 */
export function trimLogLines<T>(lines: T[], maxLines: number = MAX_LOG_LINES): T[] {
  if (lines.length <= maxLines) {
    return lines;
  }
  return lines.slice(lines.length - maxLines);
}
