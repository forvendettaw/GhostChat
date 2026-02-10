interface TURNProvider {
  urls: string | string[];
  username?: string;
  credential?: string;
  priority: number;
}

const TURN_PROVIDERS: TURNProvider[] = [
  // Google STUN servers (reliable)
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302'
    ],
    priority: 1
  },
  // Metered.ca free TURN - 支持端口80/443，移动端友好
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443?transport=tcp'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
    priority: 2
  },
  // Twilio STUN
  {
    urls: 'stun:global.stun.twilio.com:3478',
    priority: 3
  },
  // Cloudflare STUN
  {
    urls: 'stun:stun.cloudflare.com:3478',
    priority: 4
  },
  // 使用社区提供的免费TURN服务器（支持移动端）
  // 来源: https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
  {
    urls: 'turn:numb.viagenie.ca:3478',
    username: 'webrtc@live.com',
    credential: 'muazkh',
    priority: 5
  },
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:19302',
      'stun:stun4.l.google.com:19302'
    ],
    priority: 6
  },
  // Additional STUN servers for mobile compatibility
  {
    urls: 'stun:stun.miwifi.com:3478',
    priority: 7
  },
  {
    urls: 'stun:stun.syncthing.net:3478',
    priority: 8
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
