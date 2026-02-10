const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export class PeerSession {
  constructor(state) {
    this.state = state;
    this.sessions = new Map();
  }

  async fetch(request) {
    const upgrade = request.headers.get('Upgrade');
    if (upgrade === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const url = new URL(request.url);
      const id = url.searchParams.get('id');

      console.log('[WORKER] WebSocket connection for ID:', id);

      this.state.acceptWebSocket(server, [id]);

      server.send(JSON.stringify({ type: 'OPEN' }));

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('PeerJS Server', { headers: corsHeaders });
  }

  async webSocketMessage(ws, message) {
    const data = JSON.parse(message);

    console.log('[WORKER] Received message:', data.type, 'from:', data.src, 'to:', data.dst);

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
      }
    }
  }

  async webSocketClose(ws, reason) {
    const tags = this.state.getTags(ws);
    console.log('[WORKER] WebSocket closed for ID:', tags ? tags[0] : 'unknown', 'reason:', reason);
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
