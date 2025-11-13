interface TURNProvider {
  urls: string | string[];
  username?: string;
  credential?: string;
  priority: number;
}

const TURN_PROVIDERS: TURNProvider[] = [
  {
    urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
    username: 'openrelayproject',
    credential: 'openrelayproject',
    priority: 1
  },
  {
    urls: 'turn:turn.bistri.com:80',
    username: 'homeo',
    credential: 'homeo',
    priority: 2
  }
];

export function getTURNServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  TURN_PROVIDERS.sort((a, b) => a.priority - b.priority).forEach(provider => {
    servers.push({
      urls: provider.urls,
      username: provider.username,
      credential: provider.credential
    });
  });

  if (typeof window !== 'undefined') {
    const customTurn = localStorage.getItem('custom_turn_server');
    if (customTurn) {
      try {
        const custom = JSON.parse(customTurn);
        servers.push(custom);
      } catch (e) {
        console.error('Invalid custom TURN config');
      }
    }
  }

  return servers;
}
