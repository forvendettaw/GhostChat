# GhostChat 移动端连接问题 - 全面修复方案

## 问题分析

### 症状
- ✅ WebSocket 连接成功
- ✅ Offer/Answer 交换成功
- ✅ ICE 候选开始收集
- ❌ 45 秒后超时断开
- ❌ 没有收到 relay (TURN) 候选

### 根本原因

1. **TURN 服务器 external-ip 配置错误** ✅ 已修复
   - 之前：`external-ip=$(curl -s https://api.ipify.org)` (命令字符串)
   - 现在：`external-ip=45.8.204.48` (实际 IP)

2. **SimplePeer 配置不完整** ❌ 待修复
   - 缺少 `iceCandidatePoolSize`
   - 缺少 `iceTransportPolicy` 配置
   - 缺少 `bundlePolicy` 优化

3. **ICE 收集配置不优化** ❌ 待修复
   - 超时时间可能太短
   - 没有考虑移动端网络延迟

4. **移动端网络鲁棒性不足** ❌ 待修复
   - 网络切换处理不够健壮
   - 重连机制需要改进

---

## 修复方案

### 修复 1: TURN 服务器配置 ✅ 已完成

**文件：** `/opt/homebrew/etc/turnserver.conf`

**修改：**
```
external-ip=45.8.204.48  # 之前是命令字符串
```

**验证：**
```bash
brew services restart coturn
```

---

### 修复 2: SimplePeer 配置增强 ⚠️ 待实施

**文件：** `lib/peer-simplepeer.ts`

**添加配置：**

```javascript
peer = new SimplePeer({
  initiator: false,  // 或 true，取决于角色
  config: {
    iceServers: turnServers,
    iceCandidatePoolSize: 10,  // 预收集更多候选
    iceTransportPolicy: 'all',  // 允许所有传输方式
    bundlePolicy: 'max-bundle',  // 优化带宽
    rtcpMuxPolicy: 'require',  // 优化连接
  },
  // 移动端优化
  sdpTransform: (sdp) => {
    // 移除带宽限制
    return sdp.replace(/b=AS:\d+/g, '');
  },
  // ICE 收集优化
  iceCompleteTimeout: 30000,  // 30 秒超时
  allowHalfTrickle: true,  // 允许部分 trickle
});
```

---

### 修复 3: ICE 收集优化 ⚠️ 待实施

**文件：** `lib/peer-simplepeer.ts`

**添加 ICE 收集监控：**

```javascript
// 监听 ICE 候选收集状态
let iceCandidateCount = 0;
let relayCandidateFound = false;

peer.on('iceStateChange', (iceState) => {
  console.log('[ICE] State:', iceState);

  if (iceState === 'connected' || iceState === 'completed') {
    console.log('[ICE] ✅ ICE 连接成功！');
    if (relayCandidateFound) {
      console.log('[ICE] 🎉 使用 TURN 中继连接');
    } else {
      console.log('[ICE] 📡 直接 P2P 连接（未使用 TURN）');
    }
  }

  if (iceState === 'failed') {
    console.error('[ICE] ❌ ICE 连接失败！');
    addDebug(`❌ ICE 连接失败: ${iceState}`);
  }
});

peer.on('iceCandidate', (candidate) => {
  iceCandidateCount++;

  if (candidate && candidate.type === 'relay') {
    relayCandidateFound = true;
    console.log('[ICE] 🎯 找到 TURN 中继候选:', candidate);
    addDebug(`✅ TURN 中继候选: ${candidate.address}:${candidate.port}`);
  } else if (candidate) {
    console.log(`[ICE] 📦 候选 #${iceCandidateCount}: ${candidate.type} ${candidate.address}:${candidate.port}`);
  } else {
    console.log(`[ICE] 📊 ICE 收集完成，共 ${iceCandidateCount} 个候选`);
    console.log(`[ICE] Relay 候选: ${relayCandidateFound ? '✅ 找到' : '❌ 未找到'}`);

    // 如果 30 秒后没有 relay 候选，诊断问题
    setTimeout(() => {
      if (!relayCandidateFound && !peer.connected) {
        console.error('[ICE] ⏰ 30 秒内未找到 relay 候选');
        console.error('[ICE] 可能原因:');
        console.error('[ICE]   1. TURN 服务器不可达');
        console.error('[ICE]   2. 端口 3478/5349 未开放');
        console.error('[ICE]   3. 防火墙阻止连接');
        console.error('[ICE]   4. 认证凭证错误');
        addDebug(`⚠️ ICE 超时: 无 relay 候选`);
      }
    }, 30000);
  }
});
```

---

### 修复 4: 移动端鲁棒性增强 ⚠️ 待实施

**文件：** `lib/peer-simplepeer.ts`

**增强网络切换处理：**

```javascript
// 监听页面可见性变化（移动端关键）
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log('[MOBILE] 页面可见，检查连接状态');

    if (ws && ws.readyState === WebSocket.CLOSED) {
      console.log('[MOBILE] WebSocket 已断开，尝试重连');
      tryConnectWorker(currentWorkerUrl, storedOnMessage!, storedOnConnect!, storedOnDisconnect);
    }

    if (peer && !peer.connected) {
      console.log('[MOBILE] Peer 未连接，尝试重连');
      // 触发重新收集 ICE 候选
      peer._pc.restartIce();
    }
  } else {
    console.log('[MOBILE] 页面隐藏，连接可能暂停');
  }
});

// 监听网络变化
if ('connection' in navigator) {
  navigator.connection.addEventListener('change', () => {
    const connection = (navigator as any).connection;
    console.log('[MOBILE] 网络变化:', {
      type: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    });

    // 网络变化时重启 ICE
    if (peer && !peer.connected) {
      console.log('[MOBILE] 网络变化，重启 ICE 收集');
      peer._pc.restartIce();
    }
  });
}
```

---

### 修复 5: 超时和重连优化 ⚠️ 待实施

**文件：** `lib/peer-simplepeer.ts`

**改进超时配置：**

```javascript
// 移动端使用更长的超时
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const config = {
  iceServers: turnServers,
  iceTransportPolicy: isMobile ? 'relay' : 'all',  // 移动端强制中继
  iceCandidatePoolSize: isMobile ? 10 : 5,  // 移动端收集更多候选
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceCompleteTimeout: isMobile ? 60000 : 45000,  // 移动端 60 秒
};

// 移动端添加额外的超时
let connectionTimeout: NodeJS.Timeout | null = null;

peer = new SimplePeer({ initiator, config });

peer.on('connect', () => {
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }
  console.log('[PEER] ✅ P2P 连接建立');
});

// 设置连接超时
const timeoutMs = isMobile ? 60000 : 45000;
connectionTimeout = setTimeout(() => {
  if (!peer.connected) {
    console.error(`[PEER] ⏰ 连接超时 (${timeoutMs}ms)`);
    addDebug(`❌ 连接超时: ${timeoutMs}ms`);
    peer.destroy();
  }
}, timeoutMs);
```

---

## 测试和验证

### 1. 测试 TURN 服务器

```bash
node /Users/scott/GhostChat/GhostChat/test-turn-server.js
```

**预期输出：**
```
✅ 找到中继候选（TURN 正在工作）！
🎉 TURN 服务器工作正常！
```

### 2. 测试 GhostChat 连接

**步骤：**
1. 打开两个手机浏览器
2. 访问 `https://ghostchat-24o.pages.dev`
3. 设备 A 创建聊天室
4. 设备 B 粘贴邀请码
5. 观察诊断信息

**预期结果：**
- ✅ 连接建立时间 < 30 秒
- ✅ 诊断面板显示 `relay` 候选类型
- ✅ 控制台显示 `[ICE] 🎯 找到 TURN 中继候选`
- ✅ 消息可以正常发送和接收

---

## GitHub 最佳实践总结

基于 WebRTC 和 TURN 的最佳实践：

### ✅ 应该做的

1. **配置多个 TURN 服务器** - 提供冗余
2. **使用 TCP TURN** - 移动端更可靠
3. **设置正确的 external-ip** - TURN 服务器必需
4. **监控 ICE 收集状态** - 诊断问题
5. **移动端强制使用 relay** - 提高成功率
6. **合理的超时时间** - 移动端需要更长时间
7. **网络切换检测** - 自动重连
8. **详细的错误日志** - 方便调试

### ❌ 不应该做的

1. **不要禁用 iceTransportPolicy** - 应该明确设置
2. **不要设置太短的超时** - 移动端需要时间
3. **不要忽略 ICE 失败状态** - 应该处理
4. **不要只依赖 UDP** - TCP 更可靠
5. **不要关闭 fingerprint** - 安全需要

---

## 下一步行动

1. ✅ **修复 TURN 服务器配置** - 已完成
2. ⚠️ **增强 SimplePeer 配置** - 待实施
3. ⚠️ **优化 ICE 收集** - 待实施
4. ⚠️ **改进移动端处理** - 待实施
5. ⚠️ **测试和验证** - 待完成

---

**更新日期：** 2026-02-13
**版本：** v1.9.0 (计划)
