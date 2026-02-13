/**
 * Cloudflare Workers 信令服务器池
 *
 * 移动端优化：
 * - 多个备用服务器，防止单点故障
 * - 自动故障转移
 * - 支持不同地理位置的服务器（减少延迟）
 */

export const CLOUDFLARE_WORKERS = [
  // 主服务器（最可靠）
  'wss://ghostchat-signaling.forvendettaw.workers.dev/peerjs/peerjs',

  // 备用服务器（故障转移用）
  // 如果您有自己的 Cloudflare Worker，可以添加到这里
  // 'wss://your-worker.your-subdomain.workers.dev/peerjs/peerjs',

  // 注意：建议部署多个 Cloudflare Worker 在不同区域以提高可靠性
  // 可以使用 wrangler deploy --name ghostchat-signaling-2 部署多个实例
].filter(Boolean);

let currentWorkerIndex = 0;
let failedWorkers = new Set<number>(); // 记录失败的 worker 索引

/**
 * 获取当前可用的 worker
 */
export function getCurrentWorker(): string | null {
  // 尝试跳过失败的 worker
  let attempts = 0;
  const maxAttempts = CLOUDFLARE_WORKERS.length;

  while (attempts < maxAttempts) {
    if (!failedWorkers.has(currentWorkerIndex)) {
      return CLOUDFLARE_WORKERS[currentWorkerIndex];
    }

    currentWorkerIndex = (currentWorkerIndex + 1) % CLOUDFLARE_WORKERS.length;
    attempts++;
  }

  // 所有 worker 都失败过，返回第一个
  currentWorkerIndex = 0;
  return CLOUDFLARE_WORKERS[0];
}

/**
 * 获取下一个可用的 worker
 */
export function getNextWorker(): string | null {
  currentWorkerIndex = (currentWorkerIndex + 1) % CLOUDFLARE_WORKERS.length;

  // 跳过失败的 worker
  let attempts = 0;
  const maxAttempts = CLOUDFLARE_WORKERS.length;

  while (attempts < maxAttempts) {
    if (!failedWorkers.has(currentWorkerIndex)) {
      return CLOUDFLARE_WORKERS[currentWorkerIndex];
    }

    currentWorkerIndex = (currentWorkerIndex + 1) % CLOUDFLARE_WORKERS.length;
    attempts++;
  }

  return null;
}

/**
 * 标记当前 worker 为失败
 */
export function markWorkerFailed(): void {
  failedWorkers.add(currentWorkerIndex);
  console.log(`[WORKER POOL] Marked worker ${currentWorkerIndex} as failed`);
}

/**
 * 重置 worker 池状态
 */
export function resetWorkerPool(): void {
  currentWorkerIndex = 0;
  failedWorkers.clear();
  console.log('[WORKER POOL] Reset worker pool');
}

/**
 * 获取活跃 worker 数量
 */
export function getActiveWorkerCount(): number {
  return CLOUDFLARE_WORKERS.length - failedWorkers.size;
}

/**
 * 获取所有 worker 状态
 */
export function getWorkerStatus(): { total: number; active: number; failed: number; currentIndex: number } {
  return {
    total: CLOUDFLARE_WORKERS.length,
    active: CLOUDFLARE_WORKERS.length - failedWorkers.size,
    failed: failedWorkers.size,
    currentIndex: currentWorkerIndex
  };
}
