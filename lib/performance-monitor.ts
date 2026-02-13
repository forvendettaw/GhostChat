/**
 * 性能监控系统
 * 实时监控 WebRTC 连接性能和网络质量
 */

export interface PerformanceMetrics {
  // 连接质量
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  signalStrength: number; // 0-100

  // 网络延迟
  latency: number | null; // 毫秒
  jitter: number; // 延迟抖动（毫秒）
  packetLoss: number; // 丢包率（百分比）

  // 带宽
  estimatedBandwidth: number | null; // Kbps
  uploadSpeed: number | null; // Kbps
  downloadSpeed: number | null; // Kbps

  // ICE 统计
  iceConnectionState: string;
  selectedCandidateType: string | null;
  candidatePairState: string;

  // 统计时间
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100;
  private latencyHistory: number[] = [];
  private lastStatsCheck = 0;

  /**
   * 计算连接质量评分
   */
  private calculateQuality(metrics: Partial<PerformanceMetrics>): 'excellent' | 'good' | 'fair' | 'poor' {
    let score = 100;

    // 延迟扣分
    if (metrics.latency !== null && metrics.latency !== undefined) {
      if (metrics.latency > 500) score -= 30;
      else if (metrics.latency > 300) score -= 20;
      else if (metrics.latency > 150) score -= 10;
    }

    // 丢包扣分
    if (metrics.packetLoss !== undefined && metrics.packetLoss > 5) score -= 40;
    else if (metrics.packetLoss !== undefined && metrics.packetLoss > 2) score -= 20;
    else if (metrics.packetLoss !== undefined && metrics.packetLoss > 1) score -= 10;

    // 抖动扣分
    if (metrics.jitter !== undefined && metrics.jitter > 100) score -= 20;
    else if (metrics.jitter !== undefined && metrics.jitter > 50) score -= 10;

    // 带宽评估
    if (metrics.estimatedBandwidth !== null && metrics.estimatedBandwidth !== undefined) {
      if (metrics.estimatedBandwidth < 300) score -= 20;
      else if (metrics.estimatedBandwidth < 500) score -= 10;
    }

    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  /**
   * 收集 WebRTC 统计信息
   */
  async collectMetrics(peerConnection: RTCPeerConnection | null): Promise<PerformanceMetrics | null> {
    if (!peerConnection) return null;

    try {
      const stats = await peerConnection.getStats();
      const metrics: Partial<PerformanceMetrics> = {
        timestamp: Date.now(),
        iceConnectionState: peerConnection.iceConnectionState,
        selectedCandidateType: null,
        candidatePairState: 'unknown'
      };

      let totalLatency = 0;
      let latencyCount = 0;
      let totalJitter = 0;
      let totalBytesReceived = 0;
      let totalBytesSent = 0;

      stats.forEach((report) => {
        // 候选对统计
        if (report.type === 'candidate-pair') {
          if (report.state === 'succeeded') {
            metrics.selectedCandidateType = report.nominated ? 'nominated' : 'available';
            metrics.candidatePairState = 'succeeded';

            // 延迟计算
            if (report.currentRoundTripTime) {
              const rtt = report.currentRoundTripTime * 1000; // 转换为毫秒
              totalLatency += rtt;
              latencyCount++;

              // 更新延迟历史
              this.latencyHistory.push(rtt);
              if (this.latencyHistory.length > 20) {
                this.latencyHistory.shift();
              }

              metrics.latency = Math.round(rtt);

              // 计算抖动
              if (this.latencyHistory.length > 1) {
                const jitters: number[] = [];
                for (let i = 1; i < this.latencyHistory.length; i++) {
                  jitters.push(Math.abs(this.latencyHistory[i] - this.latencyHistory[i - 1]));
                }
                metrics.jitter = Math.round(jitters.reduce((a, b) => a + b, 0) / jitters.length);
              }
            }
          }
        }

        // 本地候选统计
        if (report.type === 'local-candidate') {
          metrics.selectedCandidateType = report.candidateType;
        }

        // 出入站流统计
        if (report.type === 'inbound-rtp' || report.type === 'outbound-rtp') {
          if (report.bytesReceived !== undefined) {
            totalBytesReceived += report.bytesReceived;
          }
          if (report.bytesSent !== undefined) {
            totalBytesSent += report.bytesSent;
          }
        }
      });

      // 计算丢包率
      if (latencyCount > 0) {
        // 简化的丢包检测：延迟异常高时可能有丢包
        const avgLatency = totalLatency / latencyCount;
        if (avgLatency > 1000) {
          metrics.packetLoss = Math.min((avgLatency - 1000) / 100, 10);
        } else {
          metrics.packetLoss = 0;
        }
      }

      // 估算带宽
      if (totalBytesReceived > 0 || totalBytesSent > 0) {
        const now = Date.now();
        const timeDiff = (now - this.lastStatsCheck) / 1000; // 秒

        if (timeDiff > 0) {
          if (totalBytesReceived > 0) {
            metrics.downloadSpeed = Math.round((totalBytesReceived * 8) / (timeDiff * 1024)); // Kbps
          }
          if (totalBytesSent > 0) {
            metrics.uploadSpeed = Math.round((totalBytesSent * 8) / (timeDiff * 1024)); // Kbps
          }

          metrics.estimatedBandwidth = Math.min(
            (metrics.downloadSpeed || 0) + (metrics.uploadSpeed || 0),
            10000 // 限制最大显示值
          );
        }

        this.lastStatsCheck = now;
      }

      // 计算连接质量
      metrics.connectionQuality = this.calculateQuality(metrics);

      // 信号强度（基于延迟和丢包）
      let signalStrength = 100;
      if (metrics.latency !== null && metrics.latency !== undefined) {
        signalStrength -= Math.min(metrics.latency / 10, 50);
      }
      signalStrength -= (metrics.packetLoss || 0) * 10;
      metrics.signalStrength = Math.max(0, Math.min(100, Math.round(signalStrength)));

      // 存储指标
      const fullMetrics: PerformanceMetrics = {
        connectionQuality: metrics.connectionQuality || 'poor',
        signalStrength: metrics.signalStrength,
        latency: metrics.latency || null,
        jitter: metrics.jitter || 0,
        packetLoss: metrics.packetLoss || 0,
        estimatedBandwidth: metrics.estimatedBandwidth || null,
        uploadSpeed: metrics.uploadSpeed || null,
        downloadSpeed: metrics.downloadSpeed || null,
        iceConnectionState: metrics.iceConnectionState || 'unknown',
        selectedCandidateType: metrics.selectedCandidateType || null,
        candidatePairState: metrics.candidatePairState || 'unknown',
        timestamp: metrics.timestamp || Date.now()
      };

      this.metrics.push(fullMetrics);
      if (this.metrics.length > this.maxMetrics) {
        this.metrics.shift();
      }

      return fullMetrics;
    } catch (error) {
      console.error('[PERFORMANCE] Failed to collect metrics:', error);
      return null;
    }
  }

  /**
   * 获取当前性能指标
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  /**
   * 获取历史指标
   */
  getHistoryMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * 获取平均延迟
   */
  getAverageLatency(): number | null {
    const recentMetrics = this.getHistoryMetrics(10);
    const latencies = recentMetrics
      .filter(m => m.latency !== null)
      .map(m => m.latency as number);

    if (latencies.length === 0) return null;

    return Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  }

  /**
   * 获取连接质量趋势
   */
  getQualityTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.metrics.length < 3) return 'stable';

    const recent = this.metrics.slice(-3);
    const qualities = recent.map(m => {
      const scores: Record<string, number> = {
        excellent: 100,
        good: 75,
        fair: 50,
        poor: 25
      };
      return scores[m.connectionQuality];
    });

    if (qualities[2] > qualities[1] && qualities[1] > qualities[0]) {
      return 'improving';
    }
    if (qualities[2] < qualities[1] && qualities[1] < qualities[0]) {
      return 'degrading';
    }
    return 'stable';
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const current = this.getCurrentMetrics();
    if (!current) {
      return '暂无性能数据';
    }

    const qualityEmoji = {
      excellent: '🟢',
      good: '🟡',
      fair: '🟠',
      poor: '🔴'
    };

    let report = '=== 性能监控报告 ===\n\n';
    report += `连接质量：${qualityEmoji[current.connectionQuality]} ${current.connectionQuality.toUpperCase()}\n`;
    report += `信号强度：${current.signalStrength}%\n\n`;

    report += '网络指标：\n';
    if (current.latency !== null) {
      const avgLatency = this.getAverageLatency();
      report += `- 延迟：${current.latency}ms (平均: ${avgLatency}ms)\n`;
    }
    if (current.jitter > 0) {
      report += `- 抖动：${current.jitter}ms\n`;
    }
    if (current.packetLoss > 0) {
      report += `- 丢包率：${current.packetLoss.toFixed(1)}%\n`;
    }

    report += '\n带宽：\n';
    if (current.uploadSpeed !== null) {
      report += `- 上传速度：${current.uploadSpeed} Kbps\n`;
    }
    if (current.downloadSpeed !== null) {
      report += `- 下载速度：${current.downloadSpeed} Kbps\n`;
    }
    if (current.estimatedBandwidth !== null) {
      report += `- 估算带宽：${current.estimatedBandwidth} Kbps\n`;
    }

    report += '\n连接详情：\n';
    report += `- ICE 状态：${current.iceConnectionState}\n`;
    if (current.selectedCandidateType) {
      report += `- 候选类型：${current.selectedCandidateType}\n`;
    }

    const trend = this.getQualityTrend();
    const trendEmoji = {
      improving: '📈',
      stable: '➡️',
      degrading: '📉'
    };
    report += `\n质量趋势：${trendEmoji[trend]} ${trend.toUpperCase()}\n`;

    return report;
  }

  /**
   * 清除历史数据
   */
  clear() {
    this.metrics = [];
    this.latencyHistory = [];
    this.lastStatsCheck = 0;
  }
}

export const performanceMonitor = new PerformanceMonitor();
