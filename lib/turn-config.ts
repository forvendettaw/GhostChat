interface TURNProvider {
  urls: string | string[];
  username?: string;
  credential?: string;
  priority: number;
}

const TURN_PROVIDERS: TURNProvider[] = [
  // ===== 最高优先级：自托管/商业 TURN（最可靠） =====

  // 注意：如果您有自己的 TURN 服务器，请放在这里作为最高优先级

  // ===== 高优先级：可靠的 TURN 中继服务器（支持 TCP，VPN 友好） =====

  // Metered.ca free TURN - 最高优先级，支持 TCP 和端口 443
  // 注意：免费服务可能不稳定，建议配置自己的 TURN 服务器
  {
    urls: [
      'turns:openrelay.metered.ca:443?transport=tcp',  // TURN over TLS + TCP（最可靠）
      'turn:openrelay.metered.ca:443?transport=tcp',   // TURN over TCP
      'turn:openrelay.metered.ca:80?transport=tcp',    // TURN over HTTP
      'turn:openrelay.metered.ca:443',                 // TURN over UDP
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
    priority: 10
  },

  // ===== 中优先级：其他免费 TURN 服务器 =====

  // Viagenie TURN（加拿大，社区服务器）
  {
    urls: [
      'turn:numb.viagenie.ca:3478',
      'turn:numb.viagenie.ca:80',
      'turn:numb.viagenie.ca:443?transport=tcp'
    ],
    username: 'webrtc@live.com',
    credential: 'muazkh',
    priority: 20
  },

  // ==== 额外的免费 TURN 服务器（备用） ====

  // STUNinator TURN (美国)
  {
    urls: 'turn:turn.stuninator.com:3478',
    username: 'test',
    credential: 'test',
    priority: 30
  },

  // Temp TURN 服务器（可能不稳定，但作为额外选项）
  {
    urls: 'turn:tempTURN.org:3478',
    username: 'tempturn',
    credential: 'tempturn',
    priority: 40
  },

  // Twilio STUN (可靠)
  {
    urls: 'stun:global.stun.twilio.com:3478',
    priority: 10
  },

  // ===== 低优先级：STUN 服务器（用于发现，不中继流量） =====

  // Google STUN servers（最可靠）
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302'
    ],
    priority: 20
  },

  // Cloudflare STUN
  {
    urls: 'stun:stun.cloudflare.com:3478',
    priority: 21
  },

  // 其他 STUN 服务器
  {
    urls: 'stun:stun.miwifi.com:3478',
    priority: 22
  },
  {
    urls: 'stun:stun.syncthing.net:3478',
    priority: 23
  },
  {
    urls: 'stun:stun.ideasip.com:3478',
    priority: 24
  }
];

export function getTURNServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  console.log('[TURN] Loading ICE servers...');

  TURN_PROVIDERS.sort((a, b) => a.priority - b.priority).forEach(provider => {
    const config: RTCIceServer = {
      urls: provider.urls
    };
    if (provider.username) config.username = provider.username;
    if (provider.credential) config.credential = provider.credential;
    servers.push(config);
    console.log('[TURN] Added server:', Array.isArray(provider.urls) ? provider.urls[0] : provider.urls);
  });

  if (typeof window !== 'undefined') {
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
  }

  console.log('[TURN] Total ICE servers:', servers.length);
  return servers;
}
