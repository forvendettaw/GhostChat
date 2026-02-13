import re

# 读取文件
with open('lib/peer-simplepeer.ts', 'r') as f:
    content = f.read()

# 1. 修复发起方 - 简化为 trickle: false
old_initiator = '''  peer = new SimplePeer({
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
  addDebug(`🔍 检查内部 _pc 对象...`);

  // 延迟检查 peer 内部状态
  setTimeout(() => {
    try {
      const internalPc = (peer as any)._pc;
      if (internalPc) {
        addDebug(`✅ 内部 RTCPeerConnection 存在`);
        addDebug(`🔧 RTCPeerConnection 状态: ${internalPc.connectionState || 'unknown'}`);
        addDebug(`🧊 ICE 状态: ${internalPc.iceConnectionState || 'unknown'}`);
        addDebug(`📦 ICE 收集状态: ${internalPc.iceGatheringState || 'unknown'}`);

        // 检查所有属性
        const properties = ['localDescription', 'remoteDescription', 'currentLocalDescription', 'currentRemoteDescription'];
        properties.forEach(prop => {
          const value = (internalPc as any)[prop];
          const hasValue = value ? '✓' : '✗';
          addDebug(`  ${hasValue} ${prop}: ${value ? '已设置' : '未设置'}`);
        });
      } else {
        addDebug(`❌ 内部 RTCPeerConnection 不存在！`);
      }
    } catch (e) {
      addDebug(`❌ 检查 peer 内部状态出错: ${e}`);
    }
  }, 500);'''

new_initiator = '''  peer = new SimplePeer({
    initiator: true,
    trickle: false,
    config: {
      iceServers: turnServers
    }
  });'''

content = content.replace(old_initiator, new_initiator)

# 2. 修复响应方
old_responder = '''            peer = new SimplePeer({
              initiator: false,
              config: {
                iceServers: turnServers
              },
              trickle: true
            });'''

new_responder = '''            peer = new SimplePeer({
              initiator: false,
              trickle: false,
              config: {
                iceServers: turnServers
              }
            });'''

content = content.replace(old_responder, new_responder)

# 3. 添加防止连接到自己的检查
old_func_start = '''export function connectSimplePeer(
  targetPeerId: string,
  onMessage: (peerId: string, data: string) => void,
  onConnect: (remotePeerId?: string) => void,
  onDisconnect?: (reason?: string) => void
) {
  addDebug(`🔗 开始 P2P 连接，目标 ID: ${targetPeerId}`);'''

new_func_start = '''export function connectSimplePeer(
  targetPeerId: string,
  onMessage: (peerId: string, data: string) => void,
  onConnect: (remotePeerId?: string) => void,
  onDisconnect?: (reason?: string) => void
) {
  // 防止连接到自己的 Peer ID
  if (targetPeerId === myId) {
    addDebug(`❌ 不能连接到自己的 Peer ID!`);
    console.error('[SIMPLEPEER] Cannot connect to own Peer ID!');
    if (onDisconnect) {
      onDisconnect('network-error');
    }
    return;
  }

  addDebug(`🔗 开始 P2P 连接，目标 ID: ${targetPeerId}`);'''

content = content.replace(old_func_start, new_func_start)

# 4. 移除发起方的调试日志
old_debug = '''  // 移动端检测和配置
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  console.log('[SIMPLEPEER] Device type:', isMobile ? 'MOBILE' : 'DESKTOP');
  console.log('[SIMPLEPEER] My ID:', myId);
  console.log('[SIMPLEPEER] Target ID:', targetPeerId);

  const turnServers = getTURNServers();
  addDebug(`📡 创建 P2P 连接 (initiator: true)`);
  addDebug(`🔄 ICE 策略: ${isMobile ? 'relay (mobile)' : 'all (desktop)'}`);
  addDebug(`🌐 TURN 服务器数量: ${turnServers.length}`);
  addDebug(`📦 ICE 候选池大小: ${isMobile ? 10 : 5}`);
  addDebug(`⏱️ ICE 超时: ${isMobile ? 60000 : 45000}ms`);
  console.log('[SIMPLEPEER] Creating peer (initiator: true)');
  console.log('[SIMPLEPEER] ICE transport policy:', isMobile ? 'relay (mobile)' : 'all (desktop)');
  console.log('[SIMPLEPEER] ICE candidate pool size:', isMobile ? 10 : 5);
  console.log('[SIMPLEPEER] ICE complete timeout:', isMobile ? 60000 : 45000);
  console.log('[SIMPLEPEER] TURN servers:', turnServers.length);
  turnServers.forEach((server, i) => {
    const url = Array.isArray(server.urls) ? server.urls.join(', ') : server.urls;
    console.log(`[SIMPLEPEER]   ${i + 1}. ${url}`);
  });
'''

new_debug = '''  const turnServers = getTURNServers();
  console.log('[SIMPLEPEER] Creating peer (initiator: true)');
'''

content = content.replace(old_debug, new_debug)

# 5. 简化响应方调试日志
old_res_debug = '''          console.log('[SIMPLEPEER] Creating new peer for incoming connection from:', msg.src);
            addDebug(`🆕 创建新 peer（响应方）`);
            remotePeerId = msg.src;

            // 移动端检测和配置
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            console.log('[SIMPLEPEER] Device type:', isMobile ? 'MOBILE' : 'DESKTOP');

            const turnServers = getTURNServers();
            console.log('[SIMPLEPEER] Creating peer (initiator: false)');
            console.log('[SIMPLEPEER] ICE transport policy:', isMobile ? 'relay (mobile)' : 'all (desktop)');
            console.log('[SIMPLEPEER] ICE candidate pool size:', isMobile ? 10 : 5);
            console.log('[SIMPLEPEER] ICE complete timeout:', isMobile ? 60000 : 45000);
            console.log('[SIMPLEPEER] TURN servers:', turnServers.length);
'''

new_res_debug = '''          console.log('[SIMPLEPEER] Creating new peer for incoming connection from:', msg.src);
            remotePeerId = msg.src;

            const turnServers = getTURNServers();
            console.log('[SIMPLEPEER] Creating peer (initiator: false)');
'''

content = content.replace(old_res_debug, new_res_debug)

# 写回文件
with open('lib/peer-simplepeer.ts', 'w') as f:
    f.write(content)

print("✅ 所有修复已应用")
