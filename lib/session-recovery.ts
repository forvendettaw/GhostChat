const SESSION_KEY = 'ghostchat_session';

interface Session {
  peerId: string;
  timestamp: number;
}

export function saveSession(peerId: string) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    peerId,
    timestamp: Date.now()
  }));
}

export function getSession(): Session | null {
  const data = sessionStorage.getItem(SESSION_KEY);
  if (!data) return null;
  
  const session = JSON.parse(data) as Session;
  const age = Date.now() - session.timestamp;
  
  if (age > 3600000) {
    clearSession();
    return null;
  }
  
  return session;
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
