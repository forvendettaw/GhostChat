interface InviteData {
  id: string;
  peerId: string;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
}

const DB_NAME = 'ghostchat-invites';
const STORE_NAME = 'invites';
const EXPIRY_HOURS = 24;

// UUID 生成器（兼容不支持 crypto.randomUUID() 的浏览器）
function generateUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    console.warn('[UUID] crypto.randomUUID() not available, using fallback');
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class InviteManager {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async createInvite(peerId: string): Promise<string> {
    if (!this.db) await this.init();

    const inviteId = generateUUID();
    const invite: InviteData = {
      id: inviteId,
      peerId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (EXPIRY_HOURS * 60 * 60 * 1000),
      isActive: true
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(invite);
      
      request.onsuccess = () => resolve(inviteId);
      request.onerror = () => reject(request.error);
    });
  }

  async validateInvite(inviteId: string): Promise<string | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(inviteId);
      
      request.onsuccess = () => {
        const invite = request.result as InviteData | undefined;
        if (invite && invite.isActive && Date.now() < invite.expiresAt) {
          resolve(invite.peerId);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  }

  async cleanupExpired() {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const invite = cursor.value as InviteData;
        if (Date.now() > invite.expiresAt) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  }
}

export const inviteManager = new InviteManager();
