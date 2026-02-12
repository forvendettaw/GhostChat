const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export class PeerSession {
  constructor(state) {
    this.state = state;
    this.sessions = new Map();
    // 存储每个客户端的最后活跃时间
    this.lastActivity = new Map();
    // 心跳检查间隔（30秒）
    this.heartbeatInterval = 30000;
  }

  async fetch(request) {
    const upgrade = request.headers.get('Upgrade');
    if (upgrade === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const url = new URL(request.url);
      const id = url.searchParams.get('id');

      console.log('[WORKER] WebSocket connection request for ID:', id);

      if (!id) {
        console.error('[WORKER] No ID provided in WebSocket request');
        server.close(1008, 'No ID provided');
        return new Response(null, { status: 101, webSocket: client });
      }

      this.state.acceptWebSocket(server, [id]);
      console.log('[WORKER] WebSocket accepted for ID:', id);

      // 记录初始活跃时间
      this.lastActivity.set(id, Date.now());

      // Send acknowledgment after a short delay to ensure WebSocket is ready
      setTimeout(() => {
        try {
          server.send(JSON.stringify({ type: 'OPEN' }));
          console.log('[WORKER] Sent OPEN acknowledgment to:', id);
        } catch (err) {
          console.error('[WORKER] Error sending OPEN:', err);
        }
      }, 100);

      // 定期检查心跳，清理不活跃的连接
      const heartbeatCheck = setInterval(() => {
        const now = Date.now();
        const lastSeen = this.lastActivity.get(id) || 0;
        const inactiveTime = now - lastSeen;

        if (inactiveTime > this.heartbeatInterval * 2) {
          // 超过 60 秒没有心跳，关闭连接
          console.warn(`[WORKER] Client ${id} inactive for ${inactiveTime}ms, closing connection`);
          try {
            server.close(1000, 'Heartbeat timeout');
          } catch (e) {
            // 连接可能已经关闭
          }
          clearInterval(heartbeatCheck);
          this.lastActivity.delete(id);
        }
      }, this.heartbeatInterval);

      // 保存定时器引用，以便连接关闭时清理
      server._heartbeatCheck = heartbeatCheck;

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('PeerJS Server', { headers: corsHeaders });
  }

  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);

      // 更新活跃时间
      const tags = this.state.getTags(ws);
      const peerId = tags ? tags[0] : null;
      if (peerId) {
        this.lastActivity.set(peerId, Date.now());
      }

      console.log('[WORKER] Received message:', data.type, 'from:', data.src, 'to:', data.dst);

      // 处理心跳 PING 消息，立即回复 PONG
      if (data.type === 'PING') {
        console.log('[WORKER] Received PING from', peerId, ', sending PONG');
        try {
          ws.send(JSON.stringify({ type: 'PONG' }));
        } catch (err) {
          console.error('[WORKER] Error sending PONG:', err);
        }
        return;
      }

      if (data.dst) {
        const sockets = this.state.getWebSockets();
        console.log('[WORKER] Active sockets:', sockets.length);

        let found = false;
        for (const socket of sockets) {
          const tags = this.state.getTags(socket);
          console.log('[WORKER] Checking socket with tag:', tags ? tags[0] : 'no tags');

          if (tags && tags[0] === data.dst) {
            console.log('[WORKER] Forwarding message to:', data.dst);
            socket.send(message);
            found = true;
            break;
          }
        }

        if (!found) {
          console.log('[WORKER] WARNING: Target peer not found:', data.dst);
          console.log('[WORKER] Available peer IDs:', sockets.map(s => {
            const tags = this.state.getTags(s);
            return tags ? tags[0] : 'unknown';
          }).join(', '));
        }
      }
    } catch (err) {
      console.error('[WORKER] Error processing message:', err);
    }
  }

  async webSocketClose(ws, reason) {
    const tags = this.state.getTags(ws);
    const peerId = tags ? tags[0] : 'unknown';
    console.log('[WORKER] WebSocket closed for ID:', peerId, 'reason:', reason);

    // 清理心跳定时器
    if (ws._heartbeatCheck) {
      clearInterval(ws._heartbeatCheck);
    }
    this.lastActivity.delete(peerId);

    // Log remaining active peers
    const remainingSockets = this.state.getWebSockets();
    console.log('[WORKER] Remaining active peers:', remainingSockets.length);
    if (remainingSockets.length > 0) {
      console.log('[WORKER] Active peer IDs:', remainingSockets.map(s => {
        const t = this.state.getTags(s);
        return t ? t[0] : 'unknown';
      }).join(', '));
    }
  }

  async webSocketError(ws, error) {
    const tags = this.state.getTags(ws);
    const peerId = tags ? tags[0] : 'unknown';
    console.error('[WORKER] WebSocket error for ID:', peerId);
    console.error('[WORKER] Error:', error);

    // 清理心跳定时器
    if (ws._heartbeatCheck) {
      clearInterval(ws._heartbeatCheck);
    }
    this.lastActivity.delete(peerId);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    console.log('[WORKER] Request:', request.method, url.pathname);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/peerjs/id' || url.pathname === '/peerjs/peerjs/id') {
      return new Response(crypto.randomUUID(), {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      const id = env.PEER_SESSION.idFromName('global');
      const stub = env.PEER_SESSION.get(id);
      return stub.fetch(request);
    }

    return new Response('PeerJS Server', { headers: corsHeaders });
  }
};
