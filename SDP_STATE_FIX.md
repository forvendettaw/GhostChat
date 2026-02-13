# SDP 状态机修复方案

## 问题诊断

### 核心错误
```
Failed to execute 'setRemoteDescription' on 'RTCPeerConnection': 
Failed to set remote answer sdp: Called in wrong state: stable
```

### 根本原因
1. **SDP 状态机冲突** - 在 `signalingState: stable` 时尝试再次设置 answer
2. **重复的 SDP 交换** - answer 可能被多次处理
3. **SDP 变换问题** - `sdpTransform` 可能破坏 SDP 格式

---

## 修复方案

### 方案 1：添加 SDP 状态检查

```javascript
// 在 setupPeer 函数中添加
let currentRemoteDescription: RTCSessionDescriptionInit | null = null;

// 在 peer.on('signal', (signal) => {
  if (signal.type === 'offer') {
    // 保存 remote offer
    if (!currentRemoteDescription || currentRemoteDescription.type !== 'offer') {
      currentRemoteDescription = signal;
      addDebug(`📥 保存 remote offer`);
    }
  } else if (signal.type === 'answer') {
    // 保存 remote answer（只在未保存时保存）
    if (!currentRemoteDescription || currentRemoteDescription.type !== 'answer') {
      currentRemoteDescription = signal;
      addDebug(`📥 保存 remote answer`);
    }
  } else if (signal.type === 'candidate') {
    // 处理 ICE 候选
    // ...
  }
});
```

### 方案 2：移除 SDP 变换

**临时移除 SDP 变换，避免破坏 SDP 格式**

```javascript
peer = new SimplePeer({
  initiator: true,
  config: {
    iceServers: turnServers
  },
  trickle: true
  // 暂时移除 sdpTransform
  // sdpTransform: (sdp) => { return sdp; }
});
```

### 方案 3：使用 SimplePeer 内置的 SDP 处理

SimplePeer 已经内置了 SDP 状态机处理，我们不需要手动管理 `setRemoteDescription`。

**关键改进：**
1. 移除所有高级配置选项
2. 只保留 `iceServers` 和 `trickle: true`
3. 让 SimplePeer 完全控制 SDP 交换
4. 添加调试日志追踪 SDP 状态

---

## 实施步骤

### 第 1 步：移除 SDP 变换
- [ ] 在发起方配置中移除 `sdpTransform`
- [ ] 在响应方配置中移除 `sdpTransform`

### 第 2 步：添加 SDP 状态日志
- [ ] 在 signal 处理中添加详细日志
- [ ] 追踪 SDP 交换的每一步
- [ ] 记录当前 signalingState

### 第 3 步：测试 SDP 交换
- [ ] 观察 `signalingState` 的变化
- [ ] 确认没有重复设置 answer
- [ ] 确认状态机转换正确

### 第 4 步：测试 PC-PC 连接
- [ ] 创建两个浏览器标签
- [ ] 观察完整的 SDP 交换流程
- [ ] 验证没有状态机错误

---

## 预期效果

### 成功标志
- ✅ 没有 `Called in wrong state: stable` 错误
- ✅ SDP 交换按正确的顺序进行
- ✅ Offer → Answer → ICE 收集 → 连接建立

### 关键日志
```
[SIMPLEPEER] 📥 保存 remote offer
[SIMPLEPEER] 📥 保存 remote answer
[SIMPLEPEER] ✅ SDP 交换完成
[SIMPLEPEER] 🎉 P2P connected successfully
```

---

**创建时间：** 2026-02-13 21:50
**版本：** v3.0.0（SDP 状态机修复版）
**状态：** 📝 设计完成，待实施
