import re

# 读取文件
with open('lib/peer-simplepeer.ts', 'r') as f:
    content = f.read()

# 替换发起方的 SimplePeer 创建代码
old_code = '''  peer = new SimplePeer({
    initiator: true,
    iceCompleteTimeout: isMobile ? 60000 : 45000,  // 移动端 60 秒超时
    config: {
      iceServers: turnServers,
      iceCandidatePoolSize: isMobile ? 10 : 5,  // 移动端收集更多候选
      iceTransportPolicy: isMobile ? 'relay' : 'all',  // 移动端强制中继
      bundlePolicy: 'max-bundle',  // 优化带宽
      rtcpMuxPolicy: 'require',  // 优化连接
    },
    // 添加更多调试选项
    channelConfig: {},
    channelName: 'ghostchat',
    offerOptions: {
      offerToReceiveAudio: false,
      offerToReceiveVideo: false
    },
    // 移动端优化 - 合并 sdpTransform
    sdpTransform: (sdp: string) => {
      addDebug(`📜 SDP Transform 触发 (长度: ${sdp.length})`);
      // 移除带宽限制
      return sdp.replace(/b=AS:\\d+/g, '');
    }
  });

  addDebug(`✅ Peer 对象已创建`);
  addDebug(`📦 Peer 类型: SimplePeer`);
  addDebug(`🔍 检查内部 _pc 对象...`);'''

new_code = '''  peer = new SimplePeer({
    initiator: true,
    trickle: false,
    config: {
      iceServers: turnServers
    }
  });

  setupPeer(peer, onMessage, onConnect, onDisconnect, targetPeerId);'''

content = content.replace(old_code, new_code)

# 写回文件
with open('lib/peer-simplepeer.ts', 'w') as f:
    f.write(content)

print("✅ 发起方代码已简化")
