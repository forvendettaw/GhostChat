import SimplePeer from 'simple-peer';
import { getTURNServers } from './turn-config';
import { getCurrentWorker, getNextWorker, resetWorkerPool } from './cloudflare-workers-pool';

let ws: WebSocket | null = null;
let myId: string | null = null;
let peer: SimplePeer.Instance | null = null;
let remotePeerId: string | null = null;
let storedOnMessage: ((peerId: string, data: string) => void) | null = null;
let storedOnConnect: ((remotePeerId?: string) => void) | null = null;
let storedOnDisconnect: ((reason?: string) => void) | undefined = undefined;
let p2pEstablished = false; // 跟踪P2P连接是否真正建立过
let heartbeatInterval: NodeJS.Timeout | null = null; // 心跳定时器

// 启动 WebSocket 心跳，保持连接活跃
function startHeartbeat() {
  stopHeartbeat(); // 先清除之前的心跳

  // 移动端使用更短的心跳间隔（15秒），桌面端使用 20 秒
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const interval = isMobile ? 15000 : 20000;

  console.log('[SIMPLEPEER] Starting heartbeat (interval:', interval / 1000, 's)');

  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'PING' }));
        console.log('[SIMPLEPEER] Sent PING to server');
      } catch (err) {
        console.error('[SIMPLEPEER] Error sending PING:', err);
        stopHeartbeat();
      }
    } else {
      console.log('[SIMPLEPEER] WebSocket not open, stopping heartbeat');
      stopHeartbeat();
    }
  }, interval);
}

// 停止心跳
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[SIMPLEPEER] Heartbeat stopped');
  }
}

async function tryConnectWorker(
  workerUrl: string,
  onMessage: (peerId: string, data: string) => void,
  onConnect: (remotePeerId?: string) => void,
  onDisconnect?: (reason?: string) => void
): Promise<string | null> {
  storedOnMessage = onMessage;
  storedOnConnect = onConnect;
  storedOnDisconnect = onDisconnect;

  return new Promise((resolve, reject) => {
    myId = Math.random().toString(36).substr(2, 9);

    console.log('[SIMPLEPEER] Trying worker:', workerUrl);
    ws = new WebSocket(`${workerUrl}?key=peerjs&id=${myId}&token=token`);
    
    ws.onopen = () => {
      console.log('[SIMPLEPEER] WebSocket connected, ID:', myId);
      resolve(myId);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('[SIMPLEPEER] Received message type:', msg.type, 'from:', msg.src);

        if (msg.type === 'OPEN') {
          console.log('[SIMPLEPEER] Server acknowledged');
          // 立即发送第一个 PING，保持 WebSocket 连接活跃
          try {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'PING' }));
              console.log('[SIMPLEPEER] Sent initial PING immediately');
            }
          } catch (err) {
            console.error('[SIMPLEPEER] Error sending initial PING:', err);
          }
          // 启动定期心跳
          startHeartbeat();
          return;
        }

        if (msg.type === 'PONG') {
          console.log('[SIMPLEPEER] Received PONG from server');
          return;
        }

        if (msg.type === 'SIGNAL' && msg.signal) {
          console.log('[SIMPLEPEER] Signal received from:', msg.src, 'peer exists:', !!peer);
          if (!peer) {
            console.log('[SIMPLEPEER] Creating new peer for incoming connection from:', msg.src);
            remotePeerId = msg.src;

            // 移动端检测和配置
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            console.log('[SIMPLEPEER] Device type:', isMobile ? 'MOBILE' : 'DESKTOP');

            peer = new SimplePeer({
              initiator: false,
              config: {
                iceServers: getTURNServers(),
                // 强制使用中继，改善 VPN 和移动端的连接成功率
                iceTransportPolicy: 'relay'
              }
            });

            setupPeer(peer, storedOnMessage!, storedOnConnect!, storedOnDisconnect, msg.src);
          }

          peer.signal(msg.signal);
          console.log('[SIMPLEPEER] Signal processed, peer state:', peer.connected ? 'connected' : 'connecting');
        }
      } catch (err) {
        console.error('[SIMPLEPEER] Error processing message:', err);
      }
    };
    
    ws.onerror = (err) => {
      console.error('[SIMPLEPEER] WebSocket error:', err);
      reject(err);
    };

    ws.onclose = () => {
      console.log('[SIMPLEPEER] WebSocket closed, p2pEstablished:', p2pEstablished);
      stopHeartbeat(); // 停止心跳
      // 只有在 P2P 连接已建立的情况下才调用 disconnect
      // 如果只是 WebSocket 关闭但 P2P 还没连接，不要触发 disconnect
      if (p2pEstablished) {
        console.log('[SIMPLEPEER] P2P was established, calling disconnect');
        if (peer) peer.destroy();
        if (storedOnDisconnect) storedOnDisconnect('peer-left');
      } else if (peer) {
        // 如果 peer 存在但 P2P 未建立，说明连接尝试失败了
        console.error('[SIMPLEPEER] WebSocket closed before P2P connection established');
        peer.destroy();
        if (storedOnDisconnect) storedOnDisconnect('connection-failed');
      } else {
        console.log('[SIMPLEPEER] WebSocket closed but no peer created yet, ignoring');
      }
    };

    // 移动端网络可能较慢，增加超时时间到 45 秒
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const timeout = isMobile ? 45000 : 20000;
    setTimeout(() => {
      if (ws?.readyState !== WebSocket.OPEN) {
        reject(new Error('Worker timeout'));
      }
    }, timeout);
  });
}

export async function initSimplePeer(
  onMessage: (peerId: string, data: string) => void,
  onConnect: (remotePeerId?: string) => void,
  onDisconnect?: (reason?: string) => void
): Promise<string | null> {
  resetWorkerPool();
  
  let currentWorker = getCurrentWorker();
  
  while (currentWorker) {
    try {
      const id = await tryConnectWorker(currentWorker, onMessage, onConnect, onDisconnect);
      console.log('[SIMPLEPEER] Connected to worker:', currentWorker);
      return id;
    } catch (err) {
      console.warn('[SIMPLEPEER] Worker failed:', currentWorker, err);
      const nextWorker = getNextWorker();
      if (!nextWorker) {
        throw new Error('All Cloudflare Workers failed');
      }
      currentWorker = nextWorker;
    }
  }
  
  throw new Error('No workers available');
}

function setupPeer(
  p: SimplePeer.Instance,
  onMessage: (peerId: string, data: string) => void,
  onConnect: (remotePeerId?: string) => void,
  onDisconnect?: (reason?: string) => void,
  targetPeerId?: string
) {
  let disconnectCalled = false;
  let iceTimeout: NodeJS.Timeout | null = null;
  let connectionTimeout: NodeJS.Timeout | null = null;

  const callDisconnect = (reason: string) => {
    if (!disconnectCalled && onDisconnect) {
      disconnectCalled = true;
      if (iceTimeout) clearTimeout(iceTimeout);
      if (connectionTimeout) clearTimeout(connectionTimeout);
      onDisconnect(reason);
    }
  };

  p.on('signal', (signal) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const dst = targetPeerId || remotePeerId || 'unknown';
      console.log('[SIMPLEPEER] Sending signal to:', dst, 'type:', signal.type || 'candidate', 'myId:', myId);
      const message = JSON.stringify({
        type: 'SIGNAL',
        src: myId,
        dst,
        signal
      });
      console.log('[SIMPLEPEER] Message payload:', message);
      ws.send(message);
    } else {
      console.error('[SIMPLEPEER] Cannot send signal - WebSocket not ready. State:', ws?.readyState);
    }
  });

  p.on('connect', () => {
    console.log('[SIMPLEPEER] P2P connected successfully');
    p2pEstablished = true; // 标记P2P连接已建立
    if (iceTimeout) clearTimeout(iceTimeout);
    if (connectionTimeout) clearTimeout(connectionTimeout);
    onConnect(targetPeerId || remotePeerId || undefined);

    const pc = (p as any)._pc;
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        console.log('[SIMPLEPEER] ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          console.error('[SIMPLEPEER] ICE failed or disconnected');
          callDisconnect('peer-left');
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log('[SIMPLEPEER] ICE gathering state:', pc.iceGatheringState);
      };

      pc.onconnectionstatechange = () => {
        console.log('[SIMPLEPEER] Connection state:', pc.connectionState);
      };

      // 添加 ICE 候选收集日志
      pc.onicecandidate = (event: any) => {
        if (event.candidate) {
          const type = event.candidate.candidateType || 'unknown';
          const protocol = event.candidate.protocol || 'unknown';
          console.log('[SIMPLEPEER] ICE candidate:', type, protocol, event.candidate.address);
        } else {
          console.log('[SIMPLEPEER] ICE gathering complete');
        }
      };
    }
  });

  p.on('data', (data) => {
    onMessage('remote', data.toString());
  });

  p.on('close', () => {
    console.log('[SIMPLEPEER] P2P closed gracefully');
    callDisconnect('peer-left');
  });

  p.on('error', (err) => {
    console.error('[SIMPLEPEER] P2P error:', err);
    const errMsg = err?.message || err?.toString() || '';
    if (errMsg.includes('Ice connection failed')) {
      callDisconnect('peer-left');
    } else {
      callDisconnect('network-error');
    }
  });

  // 设置 ICE 连接超时（移动端需要更长时间）
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const timeoutMs = isMobile ? 90000 : 45000; // 移动端 90 秒，桌面 45 秒

  connectionTimeout = setTimeout(() => {
    if (!p.connected) {
      console.error('[SIMPLEPEER] Connection timeout after', timeoutMs / 1000, 'seconds');
      callDisconnect('connection-timeout');
    }
  }, timeoutMs);
}

export function connectSimplePeer(
  targetPeerId: string,
  onMessage: (peerId: string, data: string) => void,
  onConnect: (remotePeerId?: string) => void,
  onDisconnect?: (reason?: string) => void
) {
  console.log('[SIMPLEPEER] Connecting to:', targetPeerId);
  console.log('[SIMPLEPEER] WebSocket state:', ws?.readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)');

  // 检查 WebSocket 是否已连接
  if (!ws || ws.readyState !== WebSocket.OPEN) {
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

  peer = new SimplePeer({
    initiator: true,
    config: {
      iceServers: getTURNServers(),
      // 强制使用中继，改善 VPN 和移动端的连接成功率
      iceTransportPolicy: 'relay'
    }
  });

  setupPeer(peer, onMessage, onConnect, onDisconnect, targetPeerId);
}

export function sendSimplePeer(data: string) {
  if (peer) {
    peer.send(data);
  }
}

export function destroySimplePeer() {
  stopHeartbeat(); // 停止心跳
  peer?.destroy();
  ws?.close();
  peer = null;
  ws = null;
  myId = null;
  remotePeerId = null;
  storedOnMessage = null;
  storedOnConnect = null;
  storedOnDisconnect = undefined;
  p2pEstablished = false; // 重置P2P连接标志
}
