// extract.js  node extract.js <stego.png> <recovered.bin>
const fs = require('fs');
const { PNG } = require('pngjs');
const [,,stegoPath, recoverPath] = process.argv;

if (!stegoPath || !recoverPath) {
  console.log('usage: node extract.js stego.png recovered.bin');
  process.exit(1);
}

// 1. 读图
const png = PNG.sync.read(fs.readFileSync(stegoPath));
const { data } = png;
let bitIdx = 0;
function readBit() {
  const pixelByte = Math.floor(bitIdx / 3);
  const channel   = bitIdx % 3;
  bitIdx++;
  return (data[pixelByte * 4 + channel] & 1);
}

// 2. 读 32 位长度
let len = 0;
for (let i = 0; i < 32; i++) len = (len << 1) | readBit();

// 3. 读 payload
const out = Buffer.alloc(len);
for (let b = 0; b < len; b++) {
  let byte = 0;
  for (let i = 0; i < 8; i++) byte = (byte << 1) | readBit();
  out[b] = byte;
}
fs.writeFileSync(recoverPath, out);
console.log(`恢复完成！共 ${len} 字节 → ${recoverPath}`);