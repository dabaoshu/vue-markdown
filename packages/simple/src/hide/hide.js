// hide.js  node hide.js <cover.png> <payload.bin> <stego.png>
const fs = require('fs');
const { PNG } = require('pngjs');   // 零原生依赖，纯 JS
const [,,coverPath, payloadPath, outPath] = process.argv;

if (!coverPath || !payloadPath || !outPath) {
  console.log('usage: node hide.js cover.png payload.bin stego.png');
  process.exit(1);
}

// 1. 读载体图
const bufCover = fs.readFileSync(coverPath);
const png = PNG.sync.read(bufCover);
const { width, height, data } = png;   // data 是 Uint8ClampedArray，RGBA
const totalPixels = width * height;
const capacity = totalPixels * 3;      // 每像素 3 通道可用（R&G&B）

// 2. 读待隐藏文件
const payload = fs.readFileSync(payloadPath);
const needBits = payload.length * 8 + 32; // 前 4 字节存长度
if (needBits > capacity) throw new Error('图片太小，塞不下');

// 3. 写长度（32 bit）+  payload
let bitIdx = 0;
function writeBit(bit) {
  const pixelByte = Math.floor(bitIdx / 3);
  const channel   = bitIdx % 3;          // 0=R,1=G,2=B
  const mask = 1 << channel;             // 0b00000001 左移
  if (bit) data[pixelByte * 4 + channel] |= 1;
  else     data[pixelByte * 4 + channel] &= 0xFE;
  bitIdx++;
}
// 写 32 位长度（大端）
const len = payload.length;
for (let i = 31; i >= 0; i--) writeBit((len >>> i) & 1);
// 写 payload 位
for (let byte of payload) {
  for (let i = 7; i >= 0; i--) writeBit((byte >>> i) & 1);
}

// 4. 输出
const out = PNG.sync.write(png);
fs.writeFileSync(outPath, out);
console.log(`完成！已隐藏 ${payload.length} 字节 → ${outPath}`);