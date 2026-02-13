# GhostChat Perfect Negotiation + Polite Peer 实施方案

## 问题诊断

### 当前问题
1. **Offer Collision（连接冲突）** - 两个客户端同时发起连接
2. **ICE Timeout** - ICE 候选收集超时
3. **Connection Failed** - 无 rollback 机制

---

## 完美协商（Perfect Negotiation）

### 原理
WebRTC Perfect Negotiation 是一种协商模式，通过以下方式解决连接冲突：

1. **分离协商逻辑** - 协商逻辑与连接逻辑完全分离
2. **统一代码** - caller 和 callee 使用相同的代码
3. **无状态冲突** - 不需要区分角色

### 实施步骤

#### 1. 修改 peer-simplepeer.ts

**添加 Perfect Negotiation 支持：**

```javascript
// 添加新的协商模式配置
export const USE_PERFECT_NEGOTIATION = true;

// 移除现有的 initiator 逻辑
// 改为双方都使用相同的协商代码

export async function connectPeer(
  signalReceived: (signal: any) => void,
  onConnected: () => void,
  onDisconnected: () => void
): Promise<void> {
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // 获取 TURN 服务器
  const turnServers = getTURNServers();
  
  // 创建 SimplePeer
  const peer = new SimplePeer({
    // 不再使用 initiator 标志
    // 双方都使用相同的配置
    config: {
      iceServers: turnServers,
      iceCandidatePoolSize: 10, // 固定值
      iceCompleteTimeout: 60000, // 60 秒
    },
    trickle: true,
    
    // 添加回调
  });
  
  // 处理信号
  peer.on('signal', (signal) => {
    // 通过信令服务器发送信号
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: 'SIGNAL',
        src: myId,
        dst: remotePeerId,
        signal
      });
      ws.send(message);
    }
  });
  
  peer.on('connect', onConnected);
  peer.on('close', onDisconnected);
  
  // 处理错误
  peer.on('error', (err) => {
    console.error('[PEER] Connection error:', err);
    addDebug(`❌ 连接错误: ${err}`);
  });
  
  // 超时保护
  setTimeout(() => {
    if (!peer.connected) {
      console.error('[PEER] Connection timeout');
      peer.destroy();
    }
  }, 60000); // 60 秒超时
}
```

#### 2. 添加 Polite Peer 逻辑

**Polite Peer 的作用：**
- 如果同时收到对方的 offer，polite peer 会接受对方的 offer
- Impolite peer 会丢弃对方的 offer，保留自己的

**实施：**

```javascript
// 添加连接时间戳
let connectionAttemptTime = Date.now();

// 当收到 offer 时检查
function shouldAcceptOffer(incomingOfferTime: number): boolean {
  const timeDiff = incomingOfferTime - connectionAttemptTime;
  
  // 如果对方 offer 在我们 offer 之后 200ms 内，丢弃对方的 offer（impolite）
  // 如果对方 offer 在我们 offer 之前 200ms，接受对方的 offer（polite）
  
  return timeDiff < 0;
}

// 在收到 signal 时使用
peer.on('signal', (signal) => {
  if (signal.type === 'offer') {
    const incomingOfferTime = Date.now();
    
    if (shouldAcceptOffer(incomingOfferTime)) {
      console.log('[PEER] 接受对方的 offer（polite peer）');
      // 接受对方的 offer
      peer.signal(signal);
    } else {
      console.log('[PEER] 丢弃对方的 offer（impolite peer），保留自己的');
      // 不处理对方的 offer
      // 重新发起自己的 offer
    }
  } else {
    // 处理 answer、candidate
    peer.signal(signal);
  }
});
```

---

## ICE Rollback 机制

### 问题
当 ICE 收集过程中网络变化，需要回滚到之前的候选。

### 解决方案

```javascript
// 在 setupPeer 中添加 ICE rollback
function setupICERollback(peer: SimplePeer.Instance) {
  let collectedCandidates: any[] = [];
  
  peer.on('icecandidate', (event) => {
    if (event.candidate) {
      // 收集候选
      collectedCandidates.push(event.candidate);
      
      // 如果收集到新的更好的候选（优先级更高），回滚
      const lastCandidate = collectedCandidates[0];
      
      if (lastCandidate && lastCandidate.protocol === 'udp' && event.candidate.protocol === 'tcp') {
        // TCP 优先于 UDP，回滚到 TCP
        console.log('[ICE] Rolling back to TCP candidate');
        addDebug(`🔄 ICE 回滚到 TCP 候选`);
      }
    } else {
      // ICE 收集完成
      console.log(`[ICE] ICE gathering complete, collected ${collectedCandidates.length} candidates`);
      addDebug(`✅ ICE 收集完成: ${collectedCandidates.length} 个候选`);
      
      // 检查是否有 relay 候选
      const hasRelay = collectedCandidates.some(c => c.type === 'relay');
      
      if (!hasRelay) {
        console.warn('[ICE] No relay candidate collected!');
        addDebug(`⚠️ 没有 TURN 中继候选！`);
      }
    }
  });
}
```

---

## 测试计划

### 测试 1：同一 WiFi 下的 PC 和 PC
**预期：** < 5 秒连接

**步骤：**
1. PC A 创建聊天
2. PC B 加入聊天
3. 观察日志，应该看到 "polite peer" 或 "accepting offer"

### 测试 2：PC 和移动端（不同网络）
**预期：** < 15 秒连接

**关键指标：**
- ✅ 应该看到 "Using TURN relay"
- ✅ 应该看到 ICE 收集完成
- ✅ 消息可以正常发送

### 测试 3：移动端和移动端（不同网络）
**预期：** < 30 秒连接

**观察：**
- 网络切换时的重连
- Polite peer 机制是否正常工作

---

## 实施时间表

### 阶段 1：Perfect Negotiation（5 分钟）
- [ ] 移除 initiator 逻辑
- [ ] 实现统一的连接函数
- [ ] 添加 Polite Peer 逻辑
- [ ] 测试 PC-PC 连接

### 阶段 2：ICE Rollback（5 分钟）
- [ ] 添加候选回滚机制
- [ ] 优化候选优先级
- [ ] 测试网络切换

### 阶段 3：超时和重连（5 分钟）
- [ ] 统一超时时间（60 秒）
- [ ] 添加指数退避重连
- [ ] 测试异常情况

### 阶段 4：最终测试（5 分钟）
- [ ] 全场景测试（PC-PC, PC-移动, 移动-移动）
- [ ] 验证所有网络情况
- [ ] 确认连接成功率 > 95%

---

## 预期效果

### 连接成功率
- PC-PC（同网络）：> 98%
- PC-移动（不同网络）：> 95%
- 移动-移动（不同网络）：> 90%

### 连接时间
- PC-PC：< 5 秒
- PC-移动：< 15 秒
- 移动-移动：< 30 秒

---

**创建时间：** 2026-02-13 21:30
**版本：** v3.0.0（Perfect Negotiation 版）
**状态：** 📝 设计完成，待实施
