import re

# 读取文件
with open('lib/peer-simplepeer.ts', 'r') as f:
    content = f.read()

# 1. 添加防止连接到自己的检查
old_start = '''export function connectSimplePeer(
  targetPeerId: string,
  onMessage: (peerId: string, data: string) => void,
  onConnect: (remotePeerId?: string) => void,
  onDisconnect?: (reason?: string) => void
) {
  addDebug(`🔗 开始 P2P 连接，目标 ID: ${targetPeerId}`);
  console.log('[SIMPLEPEER] Connecting to:', targetPeerId);
  console.log('[SIMPLEPEER] WebSocket state:', ws?.readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)');

  // 检查 WebSocket 是否已连接
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addDebug(`❌ WebSocket 未就绪! State: ${ws?.readyState}`);
    console.error('[SIMPLEPEER] WebSocket not ready! State:', ws?.readyState);
    if (onDisconnect) {
      onDisconnect('network-error');
    }
    return;
  }

  remotePeerId = targetPeerId;

  // 移动端检测和配置
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

  peer = new SimplePeer({
    initiator: true,
    iceCompleteTimeout: isMobile ? 60000 : 45000,
    config: {
      iceServers: turnServers,
      iceCandidatePoolSize: isMobile ? 10 : 5,
      iceTransportPolicy: isMobile ? 'relay' : 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    },
    channelConfig: {},
    channelName: 'ghostchat',
    offerOptions: {
      offerToReceiveAudio: false,
      offerToReceiveVideo: false
    },
    sdpTransform: (sdp: string) => {
      addDebug(`📜 SDP Transform 触发 (长度: ${sdp.length})`);
      return sdp.replace(/b=AS:\\d+/g, '');
    }
  });'''

new_start = '''export function connectSimplePeer(
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

  addDebug(`🔗 开始 P2P 连接，目标 ID: ${targetPeerId}`);
  console.log('[SIMPLEPEER] Connecting to:', targetPeerId);

  // 检查 WebSocket 是否已连接
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addDebug(`❌ WebSocket 未就绪! State: ${ws?.readyState}`);
    console.error('[SIMPLEPEER] WebSocket not ready! State:', ws?.readyState);
    if (onDisconnect) {
      onDisconnect('network-error');
    }
    return;
  }

  remotePeerId = targetPeerId;

  const turnServers = getTURNServers();
  console.log('[SIMPLEPEER] Creating peer (initiator: true)');

  peer = new SimplePeer({
    initiator: true,
    trickle: false,
    config: {
      iceServers: turnServers
    }
  });'''

content = content.replace(old_start, new_start)

# 2. 简化发起方后面的代码（移除调试日志和 setTimeout）
old_after_peer = '''  addDebug(`✅ Peer 对象已创建`);
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
  }, 500);

  setupPeer'''

new_after_peer = '''  setupPeer'''

content = content.replace(old_after_peer, new_after_peer)

# 3. 简化响应方代码
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

# 4. 简化响应方调试日志
old_responder_debug = '''            console.log('[SIMPLEPEER] Creating new peer for incoming connection from:', msg.src);
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
            console.log('[SIMPLEPEER] TURN servers:', turnServers.length);'''

new_responder_debug = '''            console.log('[SIMPLEPEER] Creating new peer for incoming connection from:', msg.src);
            remotePeerId = msg.src;

            const turnServers = getTURNServers();
            console.log('[SIMPLEPEER] Creating peer (initiator: false)');'''

content = content.replace(old_responder_debug, new_responder_debug)

# 写回文件
with open('lib/peer-simplepeer.ts', 'w') as f:
    f.write(content)

print("✅ 代码已简化")
