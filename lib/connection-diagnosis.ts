/**
 * 连接诊断工具
 * 帮助用户理解和解决连接问题
 */

export interface DiagnosticResult {
  category: 'critical' | 'warning' | 'info' | 'success';
  message: string;
  solution?: string;
  icon: string;
}

export interface ConnectionStats {
  websocketConnected: boolean;
  iceCandidatesCollected: number;
  iceCandidateTypes: { host: number; srflx: number; relay: number };
  p2pConnected: boolean;
  selectedCandidateType: string | null;
  latency: number | null;
}

/**
 * 运行完整诊断
 */
export function runDiagnostics(stats: Partial<ConnectionStats>): DiagnosticResult[] {
  const results: DiagnosticResult[] = [];

  // WebSocket 检查
  if (!stats.websocketConnected) {
    results.push({
      category: 'critical',
      message: '无法连接到信令服务器',
      icon: '🔴',
      solution: '请检查网络连接，或尝试刷新页面。如果是移动端，请尝试切换到 4G/5G。'
    });
  }

  // ICE 候选检查
  const totalCandidates = stats.iceCandidatesCollected || 0;
  if (totalCandidates === 0) {
    results.push({
      category: 'critical',
      message: '未收集到任何 ICE 候选',
      icon: '🔴',
      solution: '检查防火墙设置，确保 UDP/TCP 端口未被封禁。'
    });
  } else {
    const candidateTypes = stats.iceCandidateTypes || { host: 0, srflx: 0, relay: 0 };

    // 只有本地候选
    if (candidateTypes.relay === 0 && candidateTypes.srflx === 0) {
      results.push({
        category: 'warning',
        message: '只有本地网络候选，可能无法连接',
        icon: '⚠️',
        solution: '两个设备可能在不同的 NAT 网络中。尝试关闭 VPN 或使用 TURN 中继。'
      });
    } else if (candidateTypes.relay > 0) {
      results.push({
        category: 'success',
        message: `已收集 ${totalCandidates} 个 ICE 候选（包含 TURN 中继）`,
        icon: '✅'
      });
    } else {
      results.push({
        category: 'info',
        message: `已收集 ${totalCandidates} 个 ICE 候选`,
        icon: 'ℹ️'
      });
    }
  }

  // P2P 连接检查
  if (!stats.p2pConnected) {
    results.push({
      category: 'warning',
      message: 'P2P 连接未建立',
      icon: '⚠️',
      solution: '等待对方连接，或确保对方已点击邀请链接。'
    });
  } else {
    results.push({
      category: 'success',
      message: 'P2P 连接已建立',
      icon: '✅'
    });
  }

  // 延迟检查
  if (stats.latency !== null) {
    if (stats.latency > 1000) {
      results.push({
        category: 'warning',
        message: `网络延迟较高：${stats.latency}ms`,
        icon: '⚠️',
        solution: '建议切换到更稳定的网络。'
      });
    } else if (stats.latency > 500) {
      results.push({
        category: 'info',
        message: `网络延迟：${stats.latency}ms`,
        icon: 'ℹ️'
      });
    } else {
      results.push({
        category: 'success',
        message: `网络延迟良好：${stats.latency}ms`,
        icon: '✅'
      });
    }
  }

  return results;
}

/**
 * 获取连接建议（根据设备类型）
 */
export function getConnectionAdvice(isMobile: boolean): string[] {
  const advice: string[] = [];

  if (isMobile) {
    advice.push('📱 移动设备建议：');
    advice.push('- 使用 HTTPS 连接（自动启用）');
    advice.push('- 避免使用公共 WiFi');
    advice.push('- 关闭 VPN（可能阻断 WebSocket）');
    advice.push('- 保持屏幕开启（手机锁定会断开连接）');
  } else {
    advice.push('💻 桌面设备建议：');
    advice.push('- 确保防火墙允许 WebRTC');
    advice.push('- 尝试禁用浏览器隐私插件');
    advice.push('- 检查网络设置（代理、VPN）');
  }

  advice.push('');
  advice.push('🔒 安全建议：');
  advice.push('- 验证连接指纹（4个表情符号）');
  advice.push('- 通过独立渠道确认对方身份');
  advice.push('- 不要在不安全的网络中使用');

  return advice;
}

/**
 * 生成诊断报告
 */
export function generateDiagnosticReport(stats: Partial<ConnectionStats>, isMobile: boolean): string {
  const diagnostics = runDiagnostics(stats);
  const advice = getConnectionAdvice(isMobile);

  let report = '=== GhostChat 连接诊断报告 ===\n\n';

  report += '诊断结果：\n';
  diagnostics.forEach(result => {
    report += `${result.icon} [${result.category.toUpperCase()}] ${result.message}\n`;
    if (result.solution) {
      report += `   解决方案：${result.solution}\n`;
    }
  });

  report += '\n连接建议：\n';
  advice.forEach(line => {
    report += `${line}\n`;
  });

  report += '\n技术信息：\n';
  report += `- WebSocket: ${stats.websocketConnected ? '已连接' : '未连接'}\n`;
  report += `- ICE 候选数: ${stats.iceCandidatesCollected || 0}\n`;
  report += `- P2P 连接: ${stats.p2pConnected ? '已建立' : '未建立'}\n`;
  if (stats.latency !== null) {
    report += `- 网络延迟: ${stats.latency}ms\n`;
  }

  return report;
}

/**
 * 导出诊断信息（用于调试）
 */
export function exportDiagnostics(stats: Partial<ConnectionStats>): object {
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    connection: (navigator as any).connection?.effectiveType || 'unknown',
    stats,
    diagnostics: runDiagnostics(stats)
  };
}
