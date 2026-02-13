// TURN 服务器连接测试工具

interface TURNTestResult {
  url: string;
  success: boolean;
  latency?: number;
  error?: string;
}

export async function testTURNServer(url: string, timeout = 5000): Promise<TURNTestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: url }]
      });
      
      const timeoutId = setTimeout(() => {
        pc.close();
        resolve({
          url,
          success: false,
          error: 'Timeout'
        });
      }, timeout);
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          clearTimeout(timeoutId);
          const latency = Date.now() - startTime;
          
          // 检查是否是 relay 类型
          const candidate = event.candidate as any;
          if (candidate && candidate.candidateType === 'relay') {
            pc.close();
            resolve({
              url,
              success: true,
              latency
            });
          }
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected') {
          clearTimeout(timeoutId);
          const latency = Date.now() - startTime;
          pc.close();
          resolve({
            url,
            success: true,
            latency
          });
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          clearTimeout(timeoutId);
          pc.close();
          resolve({
            url,
            success: false,
            error: pc.iceConnectionState
          });
        }
      };
      
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
      }).catch((err) => {
        clearTimeout(timeoutId);
        pc.close();
        resolve({
          url,
          success: false,
          error: err.message
        });
      });
      
    } catch (err: any) {
      resolve({
        url,
        success: false,
        error: err.message
      });
    }
  });
}

export async function testAllTURNServers(servers: RTCIceServer[]): Promise<TURNTestResult[]> {
  const results: TURNTestResult[] = [];
  
  console.log('[TURN-TEST] 开始测试 TURN 服务器...');
  
  for (const server of servers) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    
    for (const url of urls) {
      if (url.startsWith('stun:')) continue; // 跳过 STUN
      
      console.log(`[TURN-TEST] 测试: ${url}`);
      const result = await testTURNServer(url);
      results.push(result);
      
      if (result.success) {
        console.log(`[TURN-TEST] ✅ 成功! 延迟: ${result.latency}ms`);
        break; // 如果一个成功就继续下一个服务器
      } else {
        console.log(`[TURN-TEST] ❌ 失败: ${result.error}`);
      }
    }
  }
  
  console.log('[TURN-TEST] 测试完成');
  return results;
}

// 导出到全局供调试使用
if (typeof window !== 'undefined') {
  (window as any).testTURNServers = testAllTURNServers;
}
