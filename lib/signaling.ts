import Gun from 'gun'

let gun: any;

export function initGun() {
  if (typeof window === 'undefined') return null;
  
  if (!gun) {
    gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
  }
  return gun;
}

export function joinRoom(roomId: string, peerId: string, onPeerSignal: (fromPeerId: string, signal: any) => void) {
  const g = initGun();
  if (!g) return;

  const room = g.get(`room-${roomId}`);
  
  room.get('peers').get(peerId).put({ online: true });
  
  room.get('signals').get(peerId).on((data: any) => {
    if (data && data.from && data.signal) {
      onPeerSignal(data.from, data.signal);
    }
  });
  
  room.get('peers').map().on((peer: any, id: string) => {
    if (id !== peerId && peer?.online) {
      onPeerSignal(id, null);
    }
  });
}

export function sendSignal(roomId: string, toPeerId: string, fromPeerId: string, signal: any) {
  const g = initGun();
  if (!g) return;

  g.get(`room-${roomId}`).get('signals').get(toPeerId).put({
    from: fromPeerId,
    signal,
    timestamp: Date.now()
  });
}

export function leaveRoom(roomId: string, peerId: string) {
  const g = initGun();
  if (!g) return;

  g.get(`room-${roomId}`).get('peers').get(peerId).put({ online: false });
}
