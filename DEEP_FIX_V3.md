# GhostChat 深度修复方案 - 基于 MDN WebRTC 研究

## 问题诊断

### 核心错误 1：SDP 状态机错误
```
Failed to execute 'setRemoteDescription' on 'RTCPeerConnection': 
Failed to set remote answer sdp: Called in wrong state: stable
```

**根因：** 
- 在 signalingState 为 `stable` 时尝试设置 remote answer
- 重复设置 Answer 或 Offer
- 没有使用 Perfect Negotiation 模式

### 核心错误 2：ICE 连接失败
```
ICE connection failed
```

**根因：**
- TURN 服务器配置不正确
- 网络环境复杂（NAT/防火墙）
- 没有使用 relay 模式

---

## 修复方案

### 方案 1：使用 Trickle ICE（当前使用）

**优点：**
- 连接更快
- 实时收集 ICE 候选

**缺点：**
- 需要正确处理信号交换

### 方案 2：禁用 Trickle ICE（简化信令）

**实现：**
```javascript
peer = new SimplePeer({
  initiator: true,
  trickle: false, // 禁用 Trickle ICE
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      // 添加 TURN 服务器
      {
        urls: 'turn:your-turn-server.com:3478',
        credential: 'password',
        username: 'user'
      }
    ]
  }
});
```

**优点：**
- 简化信令过程
- 更容易调试

**缺点：**
- 连接时间更长（需要等待所有 ICE 候选）

### 方案 3：Perfect Negotiation 模式（推荐）

**实现：**
```javascript
// Polite Peer 逻辑
let isPolite = true; // 可以基于某些条件确定

// 在收到信号时
peer.on('signal', (signal) => {
  if (signal.type === 'offer') {
    // 检查当前状态
    const pc = peer._pc;
    if (pc.signalingState === 'have-local-offer') {
      // 冲突！如果是 Polite Peer，使用 rollback
      if (isPolite) {
        console.log('Offer collision - Polite Peer rolling back');
        pc.rollback();
      } else {
        console.log('Offer collision - Impolite Peer ignoring');
        return; // 忽略对方的 Offer
      }
    }
  }
});
```

---

## 实施步骤

### 第 1 步：简化 SimplePeer 配置
- [x] 移除高级配置选项
- [x] 只保留 iceServers 和 trickle
- [ ] 添加 stun:stun.l.google.com:19302
- [ ] 添加更多 STUN 服务器

### 第 2 步：添加 Perfect Negotiation 逻辑
- [ ] 检测 Offer 冲突
- [ ] 实现 Polite/Impolite 角色
- [ ] 添加 ICE Rollback 逻辑

### 第 3 步：测试连接
- [ ] PC-PC 连接
- [ ] PC-移动端连接
- [ ] 移动端-移动端连接

### 第 4 步：优化
- [ ] 根据测试结果调整配置
- [ ] 添加更多 TURN 服务器
- [ ] 实现优雅降级

---

## TURN 服务器推荐

| 服务器 | 地址 | 状态 |
|--------|------|------|
| Google STUN | stun:stun.l.google.com:19302 | ✅ 免费 |
| Twilio STUN | stun:global.stun.twilio.com:3478 | ✅ 免费 |
| Metered.ca TURN | turn:openrelay.metered.ca:443 | ✅ 免费 |
| Twilio TURN | turn:global.twilio.com:3478 | ❌ 需要付费 |

---

## 预期效果

### 成功标志
- ✅ 没有 "Called in wrong state: stable" 错误
- ✅ SDP 交换按正确顺序进行
- ✅ ICE 连接成功建立
- ✅ PC-PC、PC-移动、移动-移动都能连接

### 关键日志
```
[SIMPLEPEER] ✅ Offer 发送成功
[SIMPLEPEER] ✅ Answer 接收成功
[SIMPLEPEER] ✅ ICE 连接建立
[SIMPLEPEER] 🎉 P2P 连接成功
```

---

**创建时间：** 2026-02-14
**版本：** v3.1.0（Perfect Negotiation 版）
**状态：** 📝 设计完成，待实施
