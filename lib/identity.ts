export interface Identity {
  peerId: string;
}

export function generateIdentity(): Identity {
  return {
    peerId: crypto.randomUUID()
  };
}

export function getIdentity(): Identity {
  if (typeof window === 'undefined') return { peerId: '' };
  
  let identity = (window as any).__identity;
  if (!identity) {
    identity = generateIdentity();
    (window as any).__identity = identity;
  }
  return identity;
}
