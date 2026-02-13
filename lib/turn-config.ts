interface TURNProvider {
  urls: string | string[];
  username?: string;
  credential?: string;
  priority: number;
  maxBandwidth?: number;
}

// VPN 友好配置：优先使用 TCP 和 TLS TURN 服务器
const TURN_PROVIDERS: TURNProvider[] = [
  // ===== 高优先级：VPN 友好的 TCP/TLS TURN =====

  // Metered.ca free TURN (最可靠，支持 TCP/TLS)
  {
    urls: [
      'turns:openrelay.metered.ca:443?transport=tcp',  // TLS + TCP (最 VPN 友好)
      'turn:openrelay.metered.ca:443?transport=tcp',   // TURN over TCP
      'turn:openrelay.metered.ca:80?transport=tcp',    // TURN over HTTP
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
    priority: 10,
    maxBandwidth: 3000
  },

  // Cloudflare TURN (如果可用)
  /*
  {
    urls: [
      'turns:your-turn.turn.cloudflare.com:443?transport=tcp',
    ],
    username: 'your-credential',
    credential: 'your-secret',
    priority: 15,
  },
  */

  // ===== 中优先级：其他免费 TURN =====

  // Twilio STUN/TURN (可靠)
  {
    urls: 'stun:global.stun.twilio.com:3478',
    priority: 10
  },

  // Viagenie TURN
  {
    urls: [
      'turn:numb.viagenie.ca:3478?transport=tcp',
      'turn:numb.viagenie.ca:80?transport=tcp',
      'turn:numb.viagenie.ca:443?transport=tcp'
    ],
    username: 'webrtc@live.com',
    credential: 'muazkh',
    priority: 20
  },

  // ===== 备用 TURN 服务器 =====

  // STUNinator
  {
    urls: 'turn:turn.stuninator.com:3478',
    username: 'test',
    credential: 'test',
    priority: 30
  },

  // TempTURN
  {
    urls: [
      'turn:tempTURN.org:3478?transport=tcp',
      'turn:tempTURN.org:443?transport=tcp'
    ],
    username: 'tempturn',
    credential: 'tempturn',
    priority: 40
  },

  // Meetrix
  {
    urls: [
      'turn:meetrix.com:443?transport=tcp',
      'turn:meetrix.com:3478?transport=tcp',
    ],
    username: 'meetrix',
    credential: 'meetrix',
    priority: 45
  },

  // Metered fallback
  {
    urls: 'turn:relay.metered.ca:80',
    username: 'free',
    credential: 'free',
    priority: 50
  },

  // ===== 低优先级：STUN 服务器 =====

  // Google STUN (最可靠)
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302'
    ],
    priority: 100
  },

  // Cloudflare STUN
  {
    urls: 'stun:stun.cloudflare.com:3478',
    priority: 101
  },

  // 备用 STUN
  {
    urls: 'stun:stun.syncthing.net:3478',
    priority: 102
  },
  {
    urls: 'stun:stun.ideasip.com:3478',
    priority: 103
  }
];

// 获取排序后的 TURN 服务器列表
export function getTURNServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];
  
  console.log('[TURN] Loading ICE servers...');
  
  // 按优先级排序
  TURN_PROVIDERS.sort((a, b) => a.priority - b.priority);
  
  TURN_PROVIDERS.forEach(provider => {
    const server: RTCIceServer = {
      urls: provider.urls
    };
    
    if (provider.username) {
      server.username = provider.username;
    }
    if (provider.credential) {
      server.credential = provider.credential;
    }
    
    servers.push(server);
    
    const urls = Array.isArray(provider.urls) ? provider.urls.join(', ') : provider.urls;
    console.log('[TURN] Added:', urls, '(priority:', provider.priority, ')');
  });
  
  // 检查自定义 TURN 服务器
  const customTurn = localStorage.getItem('custom_turn_server');
  if (customTurn) {
    try {
      const custom = JSON.parse(customTurn);
      servers.push(custom);
      console.log('[TURN] Added custom server');
    } catch (e) {
      console.error('[TURN] Invalid custom TURN config');
    }
  }
  
  console.log('[TURN] Total ICE servers:', servers.length);
  return servers;
}

// 设置自定义 TURN 服务器
export function setCustomTURNServer(config: RTCIceServer) {
  localStorage.setItem('custom_turn_server', JSON.stringify(config));
  console.log('[TURN] Custom server saved');
}

// 清除自定义 TURN 服务器
export function clearCustomTURNServer() {
  localStorage.removeItem('custom_turn_server');
  console.log('[TURN] Custom server cleared');
}
