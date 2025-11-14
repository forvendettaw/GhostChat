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
      
      this.state.acceptWebSocket(server, [id]);
      
      server.send(JSON.stringify({ type: 'OPEN' }));
      
      return new Response(null, { status: 101, webSocket: client });
    }
    
    return new Response('PeerJS Server', { headers: corsHeaders });
  }
  
  async webSocketMessage(ws, message) {
    const data = JSON.parse(message);
    
    if (data.dst) {
      const sockets = this.state.getWebSockets();
      for (const socket of sockets) {
        const tags = this.state.getTags(socket);
        if (tags && tags[0] === data.dst) {
          socket.send(message);
          break;
        }
      }
    }
  }
  
  async webSocketClose(ws) {
    // Socket already closed, just cleanup
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
