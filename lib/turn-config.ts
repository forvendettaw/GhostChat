interface TURNProvider {
  urls: string | string[];
  username?: string;
  credential?: string;
  priority: number;
}

const TURN_PROVIDERS: TURNProvider[] = [
  {
    urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    priority: 1
  },
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
  {
    urls: ['turn:turn.bistri.com:80', 'turn:turn.bistri.com:443'],
    username: 'homeo',
    credential: 'homeo',
    priority: 3
  },
  {
    urls: ['stun:stun.relay.metered.ca:80', 'stun:global.stun.twilio.com:3478'],
    priority: 4
  },
  {
    urls: 'stun:stun.services.mozilla.com:3478',
    priority: 5
  }
];

export function getTURNServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  TURN_PROVIDERS.sort((a, b) => a.priority - b.priority).forEach(provider => {
    const config: RTCIceServer = {
      urls: provider.urls
    };
    if (provider.username) config.username = provider.username;
    if (provider.credential) config.credential = provider.credential;
    servers.push(config);
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
