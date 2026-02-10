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
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'OPEN') {
        console.log('[SIMPLEPEER] Server acknowledged');
        return;
      }
      
      if (msg.type === 'SIGNAL' && msg.signal) {
        if (!peer) {
          console.log('[SIMPLEPEER] Incoming connection from:', msg.src);
          remotePeerId = msg.src;

          // 移动端检测和配置
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          console.log('[SIMPLEPEER] Device type:', isMobile ? 'MOBILE' : 'DESKTOP');

          peer = new SimplePeer({
            initiator: false,
            config: {
              iceServers: getTURNServers(),
              // 移动端优先使用中继，改善连接成功率
              iceTransportPolicy: isMobile ? 'relay' : 'all'
            }
          });

          setupPeer(peer, storedOnMessage!, storedOnConnect!, storedOnDisconnect, msg.src);
        }

        peer.signal(msg.signal);
      }
    };
    
    ws.onerror = (err) => {
      console.error('[SIMPLEPEER] WebSocket error:', err);
      reject(err);
    };

    ws.onclose = () => {
      console.log('[SIMPLEPEER] WebSocket closed');
      if (peer && peer.connected) {
        peer.destroy();
      }
      if (storedOnDisconnect) storedOnDisconnect('peer-left');
    };

    // 移动端网络可能较慢，增加超时时间到 15 秒
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const timeout = isMobile ? 15000 : 8000;
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
  const timeoutMs = isMobile ? 45000 : 30000; // 移动端 45 秒，桌面 30 秒

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
  remotePeerId = targetPeerId;

  // 移动端检测和配置
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  console.log('[SIMPLEPEER] Device type:', isMobile ? 'MOBILE' : 'DESKTOP');

  peer = new SimplePeer({
    initiator: true,
    config: {
      iceServers: getTURNServers(),
      // 移动端优先使用中继，改善连接成功率
      iceTransportPolicy: isMobile ? 'relay' : 'all'
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
  peer?.destroy();
  ws?.close();
  peer = null;
  ws = null;
  myId = null;
  remotePeerId = null;
  storedOnMessage = null;
  storedOnConnect = null;
  storedOnDisconnect = undefined;
}
