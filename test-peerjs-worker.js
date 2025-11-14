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
      
      server.accept();
      this.sessions.set(id, server);
      
      server.send(JSON.stringify({ type: 'OPEN' }));
      
      server.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'OFFER' || data.type === 'ANSWER' || data.type === 'CANDIDATE') {
          const target = this.sessions.get(data.dst);
          if (target) target.send(event.data);
        }
      });
      
      server.addEventListener('close', () => {
        this.sessions.delete(id);
      });
      
      return new Response(null, { status: 101, webSocket: client });
    }
    
    return new Response('PeerJS Server', { headers: corsHeaders });
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    const url = new URL(request.url);
    
    if (url.pathname === '/peerjs/peerjs/id') {
      return new Response(`"${crypto.randomUUID()}"`, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
