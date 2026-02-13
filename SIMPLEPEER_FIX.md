# SimplePeer 配置修正

## 问题

移动端连接超时设置为 120 秒（错误），但应该是 ICE 收集后的连接超时。

## SimplePeer 正确配置选项

### ✅ 支持的配置选项
```javascript
config: {
  iceServers: [...],                    // ✅ 支持
  iceCandidatePoolSize: 10,             // ✅ 支持
  iceTransportPolicy: 'relay',           // ✅ 支持
  bundlePolicy: 'max-bundle',           // ✅ 支持
  rtcpMuxPolicy: 'require',            // ✅ 支持
}
```

### ❌ 不支持的配置选项
```javascript
iceCompleteTimeout: 60000,            // ❌ 不支持！这是我们的自定义变量
```

## 修复方案

### 方案 1：使用 SimplePeer 的 timeout 选项
```javascript
peer = new SimplePeer({
  initiator: true,
  timeout: isMobile ? 60000 : 45000,  // ✅ SimplePeer 原生支持
  config: {
    iceServers: turnServers,
    iceCandidatePoolSize: isMobile ? 10 : 5,
    iceTransportPolicy: isMobile ? 'relay' : 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  },
});
```

### 方案 2：保持当前的超时检测（setupPeer 中的 timeout）
当前代码已经在 `setupPeer` 函数中有超时检测：
```javascript
connectionTimeout = setTimeout(() => {
  if (!peer.connected) {
    console.error(`[PEER] ⏰ 连接超时 (${timeoutMs}ms)`);
    peer.destroy();
  }
}, timeoutMs);
```

这部分是正确的，不需要修改 `iceCompleteTimeout`。

---

## 移除错误的配置

需要从两处移除 `iceCompleteTimeout`：

1. **第 633 行**（发起方）
2. **第 197 行**（响应方）

修改为使用 SimplePeer 原生的 `timeout` 选项。

---

## 为什么显示 120 秒？

代码中有两处超时设置：

1. **setupPeer 中的自定义超时：**
```javascript
const timeout = isMobile ? 60000 : 45000;
```

2. **另一个地方可能设置为 120000（2分钟）：**
需要搜索代码找到 120 秒的来源。

---

## 下一步

1. 搜索代码找到 120 秒的来源
2. 移除 `iceCompleteTimeout`（无效选项）
3. 使用 SimplePeer 原生的 `timeout` 选项
4. 重新构建和部署
