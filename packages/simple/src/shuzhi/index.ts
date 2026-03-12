// index.js
import { Transform } from 'stream';
import { plugins } from './plugin';

class StripStream extends Transform {
  constructor(opts = {}) {
    super({ objectMode: false });
    this.plugins = opts.plugins || plugins;
    this.tail = ''; // 处理拆行
  }

  _transform(chunk, _, cb) {
    const lines = (this.tail + chunk.toString()).split(/\r?\n/);
    this.tail = lines.pop() || ''; // 最后一行可能不完整
    for (const raw of lines) this._emit(this._runPlugins(raw));
    cb();
  }

  _flush(cb) {
    if (this.tail) this._emit(this._runPlugins(this.tail));
    cb();
  }

  _runPlugins(line) {
    let out = line;
    for (const p of this.plugins) {
      const r = p(out);
      if (r && typeof r === 'object' && r.flush) {
        // 跨行插件暂存逻辑，可扩展
        out = r.buffer;
      } else {
        out = r;
      }
      if (out === '') break;
    }
    return out;
  }

  _emit(line) {
    if (line !== '') this.push(line + '\n');
  }
}

module.exports = { StripStream };
