export const CLOUDFLARE_WORKERS = [
  'wss://ghostchat-signaling.forvendettaw.workers.dev/peerjs/peerjs',
  'wss://ghostchat-signaling.teycir.workers.dev/peerjs/peerjs',
  'wss://ghostchat-signaling.teycitek.workers.dev/peerjs/peerjs',
].filter(Boolean);

let currentWorkerIndex = 0;

export function getCurrentWorker(): string {
  return CLOUDFLARE_WORKERS[currentWorkerIndex];
}

export function getNextWorker(): string | null {
  currentWorkerIndex++;
  if (currentWorkerIndex >= CLOUDFLARE_WORKERS.length) {
    return null;
  }
  return CLOUDFLARE_WORKERS[currentWorkerIndex];
}

export function resetWorkerPool() {
  currentWorkerIndex = 0;
}
