export interface ServerConfig {
  host: string;
  port: number;
  path: string;
  secure: boolean;
}

const PRIMARY_SERVER: ServerConfig = {
  host: 'ghostchat-signaling.teycir.workers.dev',
  port: 443,
  path: '/peerjs',
  secure: true
};

const FALLBACK_SERVER: ServerConfig = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  secure: true
};

let usingFallback = false;

async function testServer(config: ServerConfig): Promise<boolean> {
  try {
    const url = `https://${config.host}${config.path}/id`;
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(3000),
      method: 'GET'
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getServerConfig(customConfig?: ServerConfig): Promise<{ config: ServerConfig; isUsingFallback: boolean }> {
  if (customConfig) {
    return { config: customConfig, isUsingFallback: false };
  }

  const primaryWorks = await testServer(PRIMARY_SERVER);
  
  if (primaryWorks) {
    usingFallback = false;
    return { config: PRIMARY_SERVER, isUsingFallback: false };
  }

  console.warn('[SERVER] Primary server unavailable, using fallback');
  usingFallback = true;
  return { config: FALLBACK_SERVER, isUsingFallback: true };
}

export function isUsingFallback(): boolean {
  return usingFallback;
}

export function getPrimaryServer(): ServerConfig {
  return PRIMARY_SERVER;
}

export function getFallbackServer(): ServerConfig {
  return FALLBACK_SERVER;
}
