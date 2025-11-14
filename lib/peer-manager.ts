import Peer, { DataConnection } from 'peerjs';
import { getTURNServers } from './turn-config';
import { compressAsync, decompressAsync } from './compression';
import { trackSent, trackReceived } from './bandwidth-monitor';

let peer: Peer | null = null;
const connections = new Map<string, DataConnection>();

const PRIMARY_SERVER = {
  host: 'ghostchat-signaling.teycir.workers.dev',
  port: 443,
  path: '/',
  secure: true
};

const FALLBACK_SERVER = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  secure: true
};

let usingFallback = false;

async function testServer(config: any): Promise<boolean> {
  try {
    const url = `https://${config.host}/peerjs/peerjs/id`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function getPeerConfig() {
  const customHost = localStorage.getItem('peerjs_host');
  
  if (customHost) {
    const port = localStorage.getItem('peerjs_port');
    const path = localStorage.getItem('peerjs_path');
    return {
      host: customHost,
      port: port ? parseInt(port) : 443,
      path: path || '/',
      secure: true
    };
  }
  
  const primaryWorks = await testServer(PRIMARY_SERVER);
  if (primaryWorks) {
    usingFallback = false;
    return PRIMARY_SERVER;
  }
  
  usingFallback = true;
  return FALLBACK_SERVER;
}

let initPromise: Promise<Peer | null> | null = null;

export async function initPeer(roomId: string, onMessage: (peerId: string, data: string) => void, onConnect: () => void, onDisconnect?: () => void, onFallback?: () => void): Promise<Peer | null> {
  if (peer && peer.id) {
    console.log('[PEER] Already initialized, returning existing peer:', peer.id);
    return peer;
  }
  
  if (initPromise) {
    console.log('[PEER] Initialization in progress, waiting...');
    return initPromise;
  }

  const id = Math.random().toString(36).substr(2, 9);
  const peerConfig = await getPeerConfig();
  
  if (usingFallback && onFallback) {
    onFallback();
  }
  
  console.log('[PEER] Initializing with config:', peerConfig);
  
  initPromise = new Promise((resolve, reject) => {
    const newPeer = new Peer(id, {
    ...peerConfig,
    config: {
      iceServers: getTURNServers()
    },
    debug: 2
  });

  newPeer.on('open', (id) => {
    console.log('[PEER] Peer opened with ID:', id);
    peer = newPeer;
    initPromise = null;
    resolve(peer);
  });
  
  newPeer.on('connection', (conn) => {
    console.log('[PEER] Incoming connection from:', conn.peer);
    setupConnection(conn, onMessage, onConnect, onDisconnect);
  });

  newPeer.on('error', (err) => {
    console.error('[PEER] Error:', err.type, err.message);
    initPromise = null;
    reject(err);
  });
  });

  return initPromise;
}

function setupConnection(conn: DataConnection, onMessage: (peerId: string, data: string) => void, onConnect: () => void, onDisconnect?: () => void) {
  connections.set(conn.peer, conn);
  
  console.log('[PEER] Setting up connection to:', conn.peer, 'state:', conn.peerConnection?.connectionState);
  
  const timeout = setTimeout(() => {
    if (!conn.open) {
      const state = conn.peerConnection?.connectionState || 'unknown';
      console.log('[PEER] Connection timeout after 30s for:', conn.peer, 'state:', state);
      if (state === 'new' || state === 'failed') {
        console.error('[PEER] Peer may not exist or is offline:', conn.peer);
      }
      conn.close();
      connections.delete(conn.peer);
      if (onDisconnect) onDisconnect();
    }
  }, 30000);
  
  if (conn.peerConnection) {
    conn.peerConnection.addEventListener('connectionstatechange', () => {
      console.log('[PEER] Connection state:', conn.peerConnection?.connectionState);
    });
    conn.peerConnection.addEventListener('iceconnectionstatechange', () => {
      console.log('[PEER] ICE state:', conn.peerConnection?.iceConnectionState);
    });
  }
  
  conn.on('data', async (data) => {
    const raw = data as string;
    trackReceived(raw.length);
    const text = await decompressAsync(raw);
    onMessage(conn.peer, text);
  });

  conn.on('open', () => {
    clearTimeout(timeout);
    console.log('[PEER] Connection OPEN to:', conn.peer);
    onConnect();
  });

  conn.on('close', () => {
    clearTimeout(timeout);
    console.log('[PEER] Connection CLOSE from:', conn.peer);
    connections.delete(conn.peer);
    if (onDisconnect) onDisconnect();
  });
  
  conn.on('error', (err) => {
    clearTimeout(timeout);
    console.error('[PEER] Connection ERROR:', err);
    connections.delete(conn.peer);
    if (onDisconnect) onDisconnect();
  });
}

export function connectToPeer(remotePeerId: string, onMessage: (peerId: string, data: string) => void, onConnect: () => void, onDisconnect?: () => void, retryCount = 0) {
  if (!peer) {
    console.error('[PEER] Cannot connect: peer not initialized');
    return;
  }
  if (connections.has(remotePeerId)) {
    console.log('[PEER] Already connected to:', remotePeerId);
    return;
  }
  
  console.log(`[PEER] Connecting to ${remotePeerId} (attempt ${retryCount + 1})`);
  console.log('[PEER] My peer ID:', peer.id);
  console.log('[PEER] Target peer ID:', remotePeerId);
  
  const conn = peer.connect(remotePeerId, {
    reliable: true,
    serialization: 'json'
  });
  
  console.log('[PEER] Connection object created:', conn);
  setupConnection(conn, onMessage, onConnect, onDisconnect);
}

export function sendToPeer(peerId: string, data: string) {
  const conn = connections.get(peerId);
  if (conn && conn.open) {
    conn.send(data);
  }
}

export async function sendToAll(data: string) {
  const compressed = await compressAsync(data);
  trackSent(compressed.length);
  connections.forEach((conn) => {
    if (conn.open) conn.send(compressed);
  });
}

export function getPeerId() {
  return peer?.id || '';
}

export function destroy() {
  connections.forEach(conn => conn.close());
  connections.clear();
  peer?.destroy();
  peer = null;
}

export function getConnectionCount(): number {
  return connections.size;
}

export function getConnections(): string[] {
  return Array.from(connections.keys());
}

export function setPeerJSConfig(host: string, port: number, path: string) {
  localStorage.setItem('peerjs_host', host);
  localStorage.setItem('peerjs_port', port.toString());
  localStorage.setItem('peerjs_path', path);
}

export function clearPeerJSConfig() {
  localStorage.removeItem('peerjs_host');
  localStorage.removeItem('peerjs_port');
  localStorage.removeItem('peerjs_path');
}

export function getPeerJSConfig() {
  return {
    host: localStorage.getItem('peerjs_host') || '',
    port: localStorage.getItem('peerjs_port') || '',
    path: localStorage.getItem('peerjs_path') || ''
  };
}
