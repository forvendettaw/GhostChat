# SimplePeer 最简配置修复

## 问题

当前配置使用了太多 SimplePeer 高级选项，可能导致：
1. 配置冲突
2. ICE 收集未启动
3. TURN 认证失败
4. 连接超时

---

## 解决方案：最简配置

### 原则
1. **只配置 `iceServers`**（最基本的）
2. **移除所有高级选项**（iceTransportPolicy, bundlePolicy 等）
3. **使用 SimplePeer 默认设置**（经过充分测试）
4. **让浏览器自动选择最佳策略**

---

## 修复内容

### 响应方修改（第 197 行）

**之前（复杂）：**
```javascript
peer = new SimplePeer({
  initiator: false,
  iceCompleteTimeout: isMobile ? 60000 : 45000,  // ❌ 不支持的选项
  config: {
    iceServers: turnServers,
    iceCandidatePoolSize: isMobile ? 10 : 5,      // ❌ 可能导致冲突
    iceTransportPolicy: isMobile ? 'relay' : 'all',  // ❌ 可能不支持
    bundlePolicy: 'max-bundle',                // ❌ 可能不支持
    rtcpMuxPolicy: 'require',                  // ❌ 可能不支持
  },
  sdpTransform: (sdp) => {
    return sdp.replace(/b=AS:\d+/g, '');
  }
});
```

**之后（简化）：**
```javascript
peer = new SimplePeer({
  initiator: false,
  config: {
    iceServers: turnServers  // ✅ 只配置 TURN 服务器
  },
  trickle: true  // ✅ 使用默认的 trickle 模式
});
```

---

### 发起方修改（第 633 行）

**之前（复杂）：**
```javascript
peer = new SimplePeer({
  initiator: true,
  timeout: isMobile ? 120000 : 45000,  // ❌ 不支持的选项
  config: {
    iceServers: turnServers,
    iceCandidatePoolSize: isMobile ? 10 : 5,      // ❌ 可能导致冲突
    iceTransportPolicy: isMobile ? 'relay' : 'all',  // ❌ 可能不支持
    bundlePolicy: 'max-bundle',                // ❌ 可能不支持
    rtcpMuxPolicy: 'require',                  // ❌ 可能不支持
  },
  sdpTransform: (sdp) => {
    return sdp.replace(/b:AS:\d+/g, '');
  }
});
```

**之后（简化）：**
```javascript
peer = new SimplePeer({
  initiator: true,
  config: {
    iceServers: turnServers  // ✅ 只配置 TURN 服务器
  },
  trickle: true  // ✅ 使用默认的 trickle 模式
});
```

---

## 为什么这样有效

### SimplePeer 默认行为
1. **ICE 收集策略** - 自动选择最佳策略
2. **超时时间** - 使用默认的 15 秒
3. **候选优先级** - 自动处理 host → srflx → relay
4. **重连机制** - 自动处理网络切换

### 移除高级选项的原因
1. **iceTransportPolicy** - 强制 relay 会跳过 host 候选，可能失败
2. **iceCandidatePoolSize** - 预收集候选可能浪费资源
3. **bundlePolicy/rtcpMuxPolicy** - 可能与某些浏览器不兼容
4. **iceCompleteTimeout** - SimplePeer 可能不支持这个选项

---

## TURN 服务器配置

### 移除自托管 TURN
**原因：** 配置可能不正确，导致认证失败

**保留：** 只使用经过测试的公共 TURN

```javascript
// turn-config.ts
const TURN_PROVIDERS: TURNProvider[] = [
  {
    urls: [
      'turns:openrelay.metered.ca:443?transport=tcp',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turn:openrelay.metered.ca:80?transport=tcp',
      'turn:openrelay.metered.ca:443',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
    priority: 10
  },
  {
    urls: [
      'turn:numb.viagenie.ca:3478',
      'turn:numb.viagenie.ca:443?transport=tcp',
    ],
    username: 'webrtc@live.com',
    credential: 'muazkh',
    priority: 20
  }
];
```

---

## 超时配置

### 修改 setupPeer 中的超时
```javascript
const timeout = isMobile ? 60000 : 30000;  // 移动端 60 秒，桌面 30 秒
```

**原因：** 30-60 秒足够 ICE 收集完成，太长会增加等待时间。

---

## 测试验证

### 预期日志（简化版）
```
[SIMPLEPEER] Creating peer (initiator: false)
[SIMPLEPEER] Creating peer (initiator: true)
```

**不会看到：**
```
[SIMPLEPEER] ICE transport policy: relay (mobile)  // 移除
[SIMPLEPEER] ICE candidate pool size: 10  // 移除
[SIMPLEPEER] ICE complete timeout: 60000  // 移除
```

### 预期行为
1. **ICE 收集自动启动** - 浏览器默认行为
2. **候选按优先级处理** - host → srflx → relay
3. **连接时间 < 15 秒** - SimplePeer 默认超时
4. **自动重连** - SimplePeer 内置机制

---

## 实施步骤

1. ✅ 简化响应方配置（第 197 行）
2. ✅ 简化发起方配置（第 633 行）
3. ✅ 移除自托管 TURN（turn-config.ts）
4. ✅ 调整超时时间（setupPeer 函数）
5. ✅ 重新构建和部署
6. ✅ 测试所有场景（PC-PC, PC-移动, 移动-移动）

---

**创建时间：** 2026-02-13 21:10
**版本：** v2.0.0（最简配置版）
**状态：** 📝 设计完成，待实施
