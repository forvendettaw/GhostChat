interface TURNProvider {
  urls: string | string[];
  username?: string;
  credential?: string;
  priority: number;
}

// 优化的 TURN 配置 - 更多服务器，更高可靠性
const TURN_PROVIDERS: TURNProvider[] = [
  // ===== 高优先级：Open Relay (最可靠的免费 TURN) =====
  {
    urls: [
      'turns:openrelay.metered.ca:443?transport=tcp',
      'turn:openrelay.metered.ca:443?transport=tcp', 
      'turn:openrelay.metered.ca:80?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
    priority: 10
  },

  // ===== 中优先级：Twilio STUN =====
  {
    urls: 'stun:global.stun.twilio.com:3478',
    priority: 20
  },

  // ===== 备用 TURN 服务器 =====
  {
    urls: [
      'turn:numb.viagenie.ca:3478?transport=tcp',
      'turn:numb.viagenie.ca:80?transport=tcp',
    ],
    username: 'webrtc@live.com',
    credential: 'muazkh',
    priority: 30
  },

  // ===== 更多免费 TURN =====
  {
    urls: [
      'turn:stunator.com:3478?transport=tcp',
      'turn:stunator.com:80?transport=tcp',
    ],
    username: 'test',
    credential: 'test',
    priority: 40
  },

  // ===== STUN 服务器 =====
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ],
    priority: 100
  },

  {
    urls: 'stun:stun.cloudflare.com:3478',
    priority: 101
  }
];

export function getTURNServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];
  
  // 按优先级排序
  const sorted = [...TURN_PROVIDERS].sort((a, b) => a.priority - b.priority);
  
  for (const provider of sorted) {
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
  }
  
  // 检查自定义服务器
  const custom = localStorage.getItem('custom_turn_server');
  if (custom) {
    try {
      servers.push(JSON.parse(custom));
    } catch (e) {}
  }
  
  return servers;
}

export function setCustomTURNServer(config: RTCIceServer) {
  localStorage.setItem('custom_turn_server', JSON.stringify(config));
}

export function clearCustomTURNServer() {
  localStorage.removeItem('custom_turn_server');
}
