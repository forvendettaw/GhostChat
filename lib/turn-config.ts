interface TURNProvider {
  urls: string | string[];
  username?: string;
  credential?: string;
  priority: number;
}

// ===== 2025年最新 TURN/STUN 服务器配置 =====

// 你的 Metered 专属 TURN Credentials (从 Dashboard 获取的)
const METERED_CREDENTIALS = {
  username: '048efb84440fbe8668df735c',
  credential: 'o55dO9exHzRhVRXp',
  urls: [
    'stun:stun.relay.metered.ca:80',
    'turn:standard.relay.metered.ca:80',
    'turn:standard.relay.metered.ca:80?transport=tcp',
    'turn:standard.relay.metered.ca:443',
    'turns:standard.relay.metered.ca:443?transport=tcp'
  ]
};

const TURN_PROVIDERS: TURNProvider[] = [
  // ===== 第一优先级：你的 Metered Credentials =====
  {
    urls: METERED_CREDENTIALS.urls,
    username: METERED_CREDENTIALS.username,
    credential: METERED_CREDENTIALS.credential,
    priority: 1
  },

  // ===== Google STUN (最可靠) =====
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ],
    priority: 20
  },

  // ===== Cloudflare + Twilio STUN =====
  {
    urls: 'stun:stun.cloudflare.com:3478',
    priority: 30
  },
  {
    urls: 'stun:global.stun.twilio.com:3478',
    priority: 40
  },

  // ===== 备用 TURN =====
  {
    urls: [
      'turns:openrelay.metered.ca:443?transport=tcp',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
    priority: 50
  },

  // ===== 更多 STUN =====
  {
    urls: [
      'stun:stun.ekiga.net',
      'stun:stun.ideasip.com',
    ],
    priority: 100
  }
];

export function getTURNServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];
  
  // 优先使用你的 Metered credentials
  servers.push({
    urls: METERED_CREDENTIALS.urls,
    username: METERED_CREDENTIALS.username,
    credential: METERED_CREDENTIALS.credential
  });
  
  // 添加备用服务器
  const sorted = [...TURN_PROVIDERS].sort((a, b) => a.priority - b.priority);
  
  for (const provider of sorted) {
    if (provider.priority === 1) continue; // 已添加
    
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
