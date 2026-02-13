// 简化 peer-simplepeer.ts 脚本

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'lib/peer-simplepeer.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 移除不必要的 addDebug 和 setTimeout 检查
content = content.replace(/addDebug\(`✅ Peer 对象已创建`\);\s*addDebug\(`📦 Peer 类型: SimplePeer`\);\s*addDebug\(`🔍 检查内部 _pc 对象\.\.\.`)\s*/g, '');
content = content.replace(/addDebug\(`🔍 检查内部 _pc 对象\.\.\.`\)/g, '');

// 移除 setTimeout 中的 peer._pc 检查
content = content.replace(/\/\/ 延迟检查 peer 内部状态\s*setTimeout\(\(\) => \{\s*try \{\s*const internalPc = \(peer as any\)\._pc;\s*/g, '');

// 保存修改后的内容
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ peer-simplepeer.ts 已简化');
