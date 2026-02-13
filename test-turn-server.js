#!/usr/bin/env node

/**
 * TURN 服务器测试工具
 * 测试 TURN 服务器是否可用
 */

const { execSync } = require('child_process');

console.log('🧪 GhostChat TURN 服务器测试');
console.log('================================\n');

// TURN 服务器配置
const TURN_SERVER = {
  url: 'turn:45.8.204.48:3478',
  username: 'ghostchat',
  credential: 'd260e6665ea30c153a739377b2c0a507',
  timeout: 10000
};

console.log('📋 测试配置:');
console.log(`  URL: ${TURN_SERVER.url}`);
console.log(`  用户名: ${TURN_SERVER.username}`);
console.log(`  超时: ${TURN_SERVER.timeout}ms\n`);

// 测试函数
async function testTURNServer() {
  return new Promise((resolve) => {
    console.log('🔍 开始测试 TURN 服务器...\n');

    const startTime = Date.now();

    // 创建 RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [{
        urls: TURN_SERVER.url,
        username: TURN_SERVER.username,
        credential: TURN_SERVER.credential
      }]
    });

    let relayCandidateFound = false;
    let iceCandidateCount = 0;

    // 监听 ICE 候选
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        iceCandidateCount++;
        const type = event.candidate.type || 'unknown';
        const protocol = event.candidate.protocol || 'unknown';
        const address = event.candidate.address || 'unknown';
        const port = event.candidate.port || 'unknown';

        console.log(`  📦 ICE 候选 #${iceCandidateCount}:`);
        console.log(`     类型: ${type}`);
        console.log(`     协议: ${protocol}`);
        console.log(`     地址: ${address}:${port}`);

        if (type === 'relay') {
          relayCandidateFound = true;
          console.log(`     ✅ 找到中继候选（TURN 正在工作）！`);
        }
      } else {
        // ICE 收集完成
        const latency = Date.now() - startTime;
        console.log(`\n📊 测试结果:`);
        console.log(`  总 ICE 候选数: ${iceCandidateCount}`);
        console.log(`  延迟: ${latency}ms`);
        console.log(`  状态: ${relayCandidateFound ? '✅ 成功' : '❌ 失败'}`);

        if (relayCandidateFound) {
          console.log(`\n🎉 TURN 服务器工作正常！`);
          console.log(`   中继地址已收集，可以进行 P2P 通信。`);
        } else {
          console.log(`\n❌ TURN 服务器未工作！`);
          console.log(`   可能原因:`);
          console.log(`   1. TURN 服务器未运行`);
          console.log(`   2. 端口 3478 未开放`);
          console.log(`   3. 防火墙阻止连接`);
          console.log(`   4. external-ip 配置错误`);
          console.log(`   5. 认证凭证错误`);
        }

        pc.close();
        resolve({
          success: relayCandidateFound,
          latency,
          candidateCount: iceCandidateCount
        });
      }
    };

    // 监听连接状态变化
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`\n🔄 ICE 连接状态: ${state}`);

      if (state === 'failed') {
        const latency = Date.now() - startTime;
        console.log(`\n❌ ICE 连接失败！`);
        console.log(`  可能原因: TURN 服务器不可达或配置错误`);

        pc.close();
        resolve({
          success: false,
          latency,
          candidateCount: iceCandidateCount,
          error: 'ICE connection failed'
        });
      }
    };

    // 创建 offer 触发 ICE 收集
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(err => {
        console.error(`\n❌ 创建 offer 失败:`, err);
        pc.close();
        resolve({
          success: false,
          error: err.message
        });
      });

    // 超时保护
    setTimeout(() => {
      if (pc.iceConnectionState !== 'closed') {
        console.log(`\n⏱️  测试超时 (${TURN_SERVER.timeout}ms)`);
        pc.close();
        resolve({
          success: false,
          timeout: true,
          candidateCount: iceCandidateCount
        });
      }
    }, TURN_SERVER.timeout);
  });
}

// 运行测试
testTURNServer().then(result => {
  console.log(`\n${'='.repeat(50)}`);
  process.exit(result.success ? 0 : 1);
}).catch(err => {
  console.error(`\n❌ 测试出错:`, err);
  process.exit(1);
});
