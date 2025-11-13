interface ConnectionQuality {
  latency: number;
  status: 'excellent' | 'good' | 'poor' | 'critical';
  lastCheck: number;
}

class ConnectionMonitor {
  private qualities = new Map<string, ConnectionQuality>();
  private intervals = new Map<string, NodeJS.Timeout>();

  startMonitoring(peerId: string, sendPing: (data: any) => void) {
    const interval = setInterval(() => {
      const start = Date.now();
      sendPing({ type: 'ping', timestamp: start });
    }, 5000);
    
    this.intervals.set(peerId, interval);
  }

  handlePong(peerId: string, timestamp: number) {
    const latency = Date.now() - timestamp;
    const status = this.getStatus(latency);
    
    this.qualities.set(peerId, {
      latency,
      status,
      lastCheck: Date.now()
    });
  }

  private getStatus(latency: number): ConnectionQuality['status'] {
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    if (latency < 1000) return 'poor';
    return 'critical';
  }

  getQuality(peerId: string): ConnectionQuality | null {
    return this.qualities.get(peerId) || null;
  }

  stopMonitoring(peerId: string) {
    const interval = this.intervals.get(peerId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(peerId);
    }
    this.qualities.delete(peerId);
  }
}

export const connectionMonitor = new ConnectionMonitor();
