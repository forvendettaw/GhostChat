interface BandwidthStats {
  bytesSent: number;
  bytesReceived: number;
  messagesPerSecond: number;
  avgMessageSize: number;
}

let stats: BandwidthStats = {
  bytesSent: 0,
  bytesReceived: 0,
  messagesPerSecond: 0,
  avgMessageSize: 0
};

let messageCount = 0;
let lastReset = Date.now();

export function trackSent(bytes: number) {
  stats.bytesSent += bytes;
  messageCount++;
  updateStats();
}

export function trackReceived(bytes: number) {
  stats.bytesReceived += bytes;
  updateStats();
}

function updateStats() {
  const elapsed = (Date.now() - lastReset) / 1000;
  if (elapsed >= 1) {
    stats.messagesPerSecond = messageCount / elapsed;
    stats.avgMessageSize = (stats.bytesSent + stats.bytesReceived) / messageCount || 0;
    messageCount = 0;
    lastReset = Date.now();
  }
}

export function getStats(): BandwidthStats {
  return { ...stats };
}

export function shouldCompress(messageSize: number): boolean {
  return messageSize > 100;
}

export function reset() {
  stats = {
    bytesSent: 0,
    bytesReceived: 0,
    messagesPerSecond: 0,
    avgMessageSize: 0
  };
  messageCount = 0;
  lastReset = Date.now();
}
