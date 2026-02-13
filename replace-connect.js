const fs = require('fs');
const path = require('path');

// 读取新的简化版本
const newFunctionPath = path.join(__dirname, 'lib/connectSimplePeer-super-simple.ts');
const oldFilePath = path.join(__dirname, 'lib/peer-simplepeer.ts');

const newFunction = fs.readFileSync(newFunctionPath, 'utf8');

// 读取旧文件
let oldContent = fs.readFileSync(oldFilePath, 'utf8');

// 找到 connectSimplePeer 函数的开始
const startMarker = 'export function connectSimplePeer(';
const endMarker = '\n}\n\nexport function sendSimplePeer(';

const startIndex = oldContent.indexOf(startMarker);
if (startIndex === -1) {
  console.error('❌ 找不到 connectSimplePeer 函数开始');
  process.exit(1);
}

// 找到函数结束（找到下一个 export function 或文件结束）
const afterStart = oldContent.substring(startIndex);
const endIndex = afterStart.indexOf(endMarker);

if (endIndex === -1) {
  console.error('❌ 找不到 connectSimplePeer 函数结束');
  process.exit(1);
}

const newContent = oldContent.substring(0, startIndex) + newFunction + oldContent.substring(endIndex);

// 写入新内容
fs.writeFileSync(oldFilePath, newContent, 'utf8');

console.log('✅ connectSimplePeer 函数已替换为简化版本');
console.log('📝 修改内容：');
console.log('  - 移除所有高级配置选项');
console.log('  - 移除复杂的调试代码');
console.log('  - 移除 setTimeout 检查');
console.log('  - 只保留最基本的功能');
