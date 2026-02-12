/**
 * TURN 服务器连接测试工具
 * 用于诊断 TURN 服务器是否可达
 */

export interface TURNTestResult {
  url: string;
  reachable: boolean;
  latency?: number;
  error?: string;
}

/**
 * 测试单个 TURN 服务器的可达性
 */
async function testTURNServer(url: string, timeout = 5000): Promise<TURNTestResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        url,
        reachable: false,
        error: `Timeout after ${timeout}ms`
      });
    }, timeout);

    // 创建一个测试 RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: url }]
    });

    // 监听 ICE 候选收集
    let candidateFound = false;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const type = (event.candidate as any).candidateType;
        const candidateUrl = (event.candidate as any).url || event.candidate.address || '';

        console.log(`[TURN-TEST] Candidate for ${url}:`, type, candidateUrl);

        if (type === 'relay' || (candidateUrl.includes(url) && type !== 'host')) {
          candidateFound = true;
          clearTimeout(timer);
          pc.close();

          resolve({
            url,
            reachable: true,
            latency: Date.now() - startTime
          });
        }
      } else {
        // 收集完成
        clearTimeout(timer);
        pc.close();

        if (!candidateFound) {
          resolve({
            url,
            reachable: false,
            error: 'No relay candidate gathered (TURN may be unreachable)'
          });
        }
      }
    };

    // 创建 offer 触发 ICE 收集
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(err => {
        clearTimeout(timer);
        pc.close();
        resolve({
          url,
          reachable: false,
          error: err?.message || 'Failed to create offer'
        });
      });

    // 错误处理
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        clearTimeout(timer);
        pc.close();
        resolve({
          url,
          reachable: false,
          error: 'ICE connection failed'
        });
      }
    };
  });
}

/**
 * 测试所有 TURN 服务器
 */
export async function testAllTURNServers(servers: RTCIceServer[]): Promise<TURNTestResult[]> {
  console.log('[TURN-TEST] 开始测试 TURN 服务器...');
  const results: TURNTestResult[] = [];

  for (const server of servers) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];

    for (const url of urls) {
      if (url.includes('stun:')) {
        // 跳过 STUN 服务器（仅用于发现，不中继流量）
        continue;
      }

      console.log(`[TURN-TEST] 测试 ${url}...`);
      const result = await testTURNServer(url);
      results.push(result);

      const status = result.reachable ? `✅ ${result.latency}ms` : `❌ ${result.error}`;
      console.log(`[TURN-TEST] ${url}: ${status}`);
    }
  }

  console.log('[TURN-TEST] 测试完成');
  return results;
}

/**
 * 检测网络环境
 */
export function detectNetworkEnvironment(): {
  isMobile: boolean;
  connectionType: string;
  effectiveType: string;
  saveData: boolean;
  rtt: number | undefined;
  downlink: number | undefined;
} {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

  return {
    isMobile,
    connectionType: conn?.type || 'unknown',
    effectiveType: conn?.effectiveType || 'unknown',
    saveData: conn?.saveData || false,
    rtt: conn?.rtt,
    downlink: conn?.downlink
  };
}

/**
 * 在浏览器控制台打印诊断报告
 */
export function printDiagnosticReport() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║         GhostChat 网络诊断报告                ║');
  console.log('╚════════════════════════════════════════════════╝');

  const netInfo = detectNetworkEnvironment();
  console.log('\n📱 网络环境：');
  console.log(`   - 设备类型: ${netInfo.isMobile ? '移动端' : '桌面端'}`);
  console.log(`   - 连接类型: ${netInfo.connectionType}`);
  console.log(`   - 有效带宽: ${netInfo.effectiveType}`);
  console.log(`   - 节省数据: ${netInfo.saveData ? '是' : '否'}`);
  if (netInfo.rtt) console.log(`   - 往返时延: ${netInfo.rtt}ms`);
  if (netInfo.downlink) console.log(`   - 下行带宽: ${netInfo.downlink}Mbps`);

  console.log('\n🌐 WebRTC 支持：');
  console.log(`   - RTCPeerConnection: ${typeof RTCPeerConnection !== 'undefined' ? '✅' : '❌'}`);
  console.log(`   - WebSocket: ${typeof WebSocket !== 'undefined' ? '✅' : '❌'}`);

  console.log('\n💡 常见问题：');
  console.log('   1. 双方都开 VPN → 关闭至少一方的 VPN');
  console.log('   2. 防火墙阻止 → 关闭防火墙或使用移动热点');
  console.log('   3. TURN 服务器故障 → 使用内置 TURN 测试工具');
  console.log('   4. 移动网络不稳定 → 改用 WiFi');

  console.log('\n🔧 快速修复：');
  console.log('   - 双方都关闭 VPN');
  console.log('   - 双方都使用 WiFi');
  console.log('   - 刷新页面重试');
  console.log('   - 等待 2 分钟让 ICE 收集完成');
}
