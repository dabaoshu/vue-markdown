class BufferedScheduler {
  constructor(options = {}) {
    // 配置参数
    this.maxLength = options.maxLength || 15; // 最大字符数阈值
    this.delay = options.delay || 300; // 延迟时间（毫秒）
    this.onExecute = options.onExecute || (() => {}); // 执行回调

    // 内部状态
    this.buffer = ''; // 字符缓冲区
    this.timer = null; // 定时器引用
    this.lastFlushTime = 0; // 上次执行时间
  }

  /**
   * 添加字符到缓冲区
   * @param {string} char - 输入的字符（或字符串）
   * @returns {boolean} - 是否立即触发了执行
   */
  add(char) {
    if (typeof char !== 'string') {
      char = String(char);
    }

    this.buffer += char;

    // 检查是否达到长度阈值
    if (this.buffer.length >= this.maxLength) {
      this.flush('length');
      return true;
    }

    // 重置定时器（防抖逻辑）
    this.resetTimer();
    return false;
  }

  /**
   * 立即执行并清空缓冲区
   * @param {string} trigger - 触发原因 'length' | 'timeout' | 'manual'
   */
  flush(trigger = 'manual') {
    if (this.buffer.length === 0) return;

    const content = this.buffer;
    this.buffer = '';
    this.clearTimer();
    this.lastFlushTime = Date.now();

    // 执行回调，传递内容和触发原因
    this.onExecute({
      content,
      trigger,
      timestamp: this.lastFlushTime,
      length: content.length
    });
  }

  /**
   * 重置定时器
   */
  resetTimer() {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.flush('timeout');
    }, this.delay);
  }

  /**
   * 清除定时器
   */
  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * 获取当前缓冲区内容（不触发执行）
   */
  peek() {
    return this.buffer;
  }

  /**
   * 获取当前缓冲区长度
   */
  get length() {
    return this.buffer.length;
  }

  /**
   * 手动取消待执行的任务
   */
  cancel() {
    this.clearTimer();
    this.buffer = '';
  }

  /**
   * 销毁实例，清理资源
   */
  destroy() {
    this.cancel();
    this.onExecute = null;
  }
}

// ============ 使用示例 ============

// 创建调度器实例
const scheduler = new BufferedScheduler({
  maxLength: 10,
  delay: 300,
  onExecute: ({ content, trigger, timestamp }) => {
    console.log(
      `[${trigger.toUpperCase()}] 执行内容: "${content}" (长度: ${
        content.length
      })`
    );
  }
});

// 测试场景1：快速输入，超过10字符立即触发
console.log('--- 场景1：长度触发 ---');
scheduler.add('Hello'); // 不触发，长度5
scheduler.add(' World!!!'); // 触发，总长度12超过阈值

// 测试场景2：缓慢输入，超时触发
console.log('--- 场景2：超时触发 ---');
scheduler.add('Hi');
setTimeout(() => scheduler.add(' there'), 100);
setTimeout(() => scheduler.add(' friend1'), 200);
setTimeout(() => scheduler.add(' friend2'), 400);
setTimeout(() => scheduler.add('2'), 1600);
setTimeout(() => scheduler.add(' 6'), 2800);
setTimeout(() => scheduler.add(' friend4'), 1100);
setTimeout(() => scheduler.add(' fend6'), 2040);
// 最后一次输入后300ms，总计约600ms触发，内容："Hi there friend"

// 测试场景3：查看状态和控制
console.log('--- 场景3：状态控制 ---');
const s2 = new BufferedScheduler({
  maxLength: 5,
  delay: 1000,
  onExecute: (data) => console.log('执行:', data)
});

s2.add('abc');
console.log('当前缓冲:', s2.peek()); // "abc"
console.log('当前长度:', s2.length); // 3

s2.flush('manual'); // 手动强制触发
console.log('flush后长度:', s2.length); // 0

// 清理
s2.destroy();
