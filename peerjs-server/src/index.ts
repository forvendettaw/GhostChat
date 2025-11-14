export interface Env {
  PEER_REGISTRY: DurableObjectNamespace;
}

export class PeerRegistry {
  state: DurableObjectState;
  sessions: Map<string, WebSocket>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      
      const peerId = url.searchParams.get('id');
      if (!peerId) {
        return new Response('Missing peer ID', { status: 400 });
      }

      this.sessions.set(peerId, server);
      
      server.accept();
      
      server.addEventListener('message', (event) => {
        const data = JSON.parse(event.data as string);
        
        if (data.type === 'OFFER' || data.type === 'ANSWER' || data.type === 'CANDIDATE') {
          const targetPeer = this.sessions.get(data.dst);
          if (targetPeer) {
            targetPeer.send(JSON.stringify(data));
          }
        }
      });

      server.addEventListener('close', () => {
        this.sessions.delete(peerId);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('PeerJS Signaling Server', { status: 200 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname.startsWith('/peerjs')) {
      const id = env.PEER_REGISTRY.idFromName('global');
      const stub = env.PEER_REGISTRY.get(id);
      return stub.fetch(request);
    }

    return new Response('GhostChat Signaling Server', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
};
