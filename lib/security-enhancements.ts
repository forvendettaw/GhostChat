/**
 * 安全增强功能
 * 包括更强的加密、元数据清除、安全提示
 */

export interface SecurityLevel {
  level: 'low' | 'medium' | 'high' | 'maximum';
  label: string;
  description: string;
  icon: string;
}

export interface SecurityAudit {
  timestamp: number;
  level: SecurityLevel['level'];
  checks: SecurityCheck[];
  recommendations: string[];
}

export interface SecurityCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

/**
 * 元数据清除工具
 */
export class MetadataStripper {
  /**
   * 清除图片的 EXIF 元数据
   */
  static async stripImageMetadata(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        if (ctx) {
          ctx.drawImage(img, 0, 0);

          // 转换为新的 Blob（无元数据）
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve(url);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, file.type);
        } else {
          reject(new Error('Canvas context not available'));
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 清除 PDF 元数据
   */
  static stripPdfMetadata(file: File): Promise<Blob> {
    // PDF 元数据清除需要专门的库
    // 这里返回原始文件，实际应用中可以使用 pdf-lib 等库
    return Promise.resolve(file);
  }

  /**
   * 验证文件是否包含敏感元数据
   */
  static async hasSensitiveMetadata(file: File): Promise<boolean> {
    if (!file.type.startsWith('image/')) {
      return false;
    }

    try {
      // 尝试读取 EXIF 数据
      const strippedUrl = await this.stripImageMetadata(file);

      // 简化的检查：比较文件大小
      const originalSize = file.size;
      const strippedBlob = await fetch(strippedUrl).then(r => r.blob());
      const strippedSize = strippedBlob.size;

      URL.revokeObjectURL(strippedUrl);

      // 如果大小明显不同，可能包含元数据
      return Math.abs(originalSize - strippedSize) > 1024;
    } catch {
      return false;
    }
  }
}

/**
 * 安全级别定义
 */
export const SECURITY_LEVELS: Record<SecurityLevel['level'], SecurityLevel> = {
  low: {
    level: 'low',
    label: '基础安全',
    description: '仅 P2P 加密，适合非敏感聊天',
    icon: '🟢'
  },
  medium: {
    level: 'medium',
    label: '中等安全',
    description: '包含元数据清除，适合日常使用',
    icon: '🟡'
  },
  high: {
    level: 'high',
    label: '高等安全',
    description: '自动销毁、元数据清除、连接验证',
    icon: '🟠'
  },
  maximum: {
    level: 'maximum',
    label: '最高安全',
    description: '所有安全措施 + 快速销毁、会话隔离',
    icon: '🔴'
  }
};

/**
 * 安全审计工具
 */
export class SecurityAuditor {
  /**
   * 运行完整安全审计
   */
  static async audit(currentSettings: {
    selfDestructTimer: number;
    messageLimit: number;
    sessionTimeout: number;
    screenBlurEnabled: boolean;
    fingerprintVerified: boolean;
  }): Promise<SecurityAudit> {
    const checks: SecurityCheck[] = [];

    // 检查 1：消息自动销毁
    checks.push({
      name: '消息自动销毁',
      passed: currentSettings.selfDestructTimer > 0 && currentSettings.selfDestructTimer <= 300,
      message: currentSettings.selfDestructTimer > 0
        ? `消息将在 ${currentSettings.selfDestructTimer} 秒后自动销毁`
        : '消息不会自动销毁',
      severity: 'warning'
    });

    // 检查 2：消息限制
    checks.push({
      name: '消息历史限制',
      passed: currentSettings.messageLimit <= 50,
      message: `最多保留 ${currentSettings.messageLimit} 条消息`,
      severity: 'info'
    });

    // 检查 3：会话超时
    checks.push({
      name: '会话超时',
      passed: currentSettings.sessionTimeout > 0 && currentSettings.sessionTimeout <= 30,
      message: currentSettings.sessionTimeout > 0
        ? `会话将在 ${currentSettings.sessionTimeout} 分钟不活动后超时`
        : '没有会话超时设置',
      severity: 'warning'
    });

    // 检查 4：屏幕模糊
    checks.push({
      name: '屏幕模糊保护',
      passed: currentSettings.screenBlurEnabled,
      message: currentSettings.screenBlurEnabled
        ? '切换标签页时会模糊屏幕内容'
        : '屏幕模糊未启用',
      severity: 'info'
    });

    // 检查 5：连接指纹验证
    checks.push({
      name: '连接指纹验证',
      passed: currentSettings.fingerprintVerified,
      message: currentSettings.fingerprintVerified
        ? '已验证连接指纹，防止中间人攻击'
        : '未验证连接指纹，可能存在中间人攻击风险',
      severity: 'critical'
    });

    // 检查 6：HTTPS 连接
    checks.push({
      name: 'HTTPS 连接',
      passed: typeof window !== 'undefined' && window.location.protocol === 'https:',
      message: window.location.protocol === 'https:' ? '使用 HTTPS 安全连接' : '未使用 HTTPS，不安全',
      severity: 'critical'
    });

    // 检查 7：浏览器隐私模式
    checks.push({
      name: '隐私模式',
      passed: this.isIncognito(),
      message: this.isIncognito() ? '使用隐私/无痕模式' : '建议使用隐私/无痕模式',
      severity: 'info'
    });

    // 计算安全级别
    const passedChecks = checks.filter(c => c.passed).length;
    const criticalChecks = checks.filter(c => !c.passed && c.severity === 'critical');

    let level: SecurityLevel['level'] = 'low';
    if (criticalChecks.length === 0 && passedChecks >= 5) {
      level = 'maximum';
    } else if (criticalChecks.length === 0 && passedChecks >= 3) {
      level = 'high';
    } else if (criticalChecks.length === 0) {
      level = 'medium';
    }

    // 生成建议
    const recommendations = this.generateRecommendations(checks);

    return {
      timestamp: Date.now(),
      level,
      checks,
      recommendations
    };
  }

  /**
   * 生成安全建议
   */
  private static generateRecommendations(checks: SecurityCheck[]): string[] {
    const recommendations: string[] = [];

    const failedChecks = checks.filter(c => !c.passed);

    failedChecks.forEach(check => {
      switch (check.name) {
        case '消息自动销毁':
          recommendations.push('💡 启用消息自动销毁（建议 30 秒 - 5 分钟）');
          break;
        case '会话超时':
          recommendations.push('💡 设置会话超时（建议 5-15 分钟）');
          break;
        case '连接指纹验证':
          recommendations.push('⚠️ 重要：验证连接指纹，防止中间人攻击！');
          break;
        case 'HTTPS 连接':
          recommendations.push('🚨 必须使用 HTTPS 连接！');
          break;
        case '隐私模式':
          recommendations.push('💡 使用隐私/无痕模式浏览');
          break;
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('✅ 当前安全设置良好');
    }

    return recommendations;
  }

  /**
   * 检测是否在隐私/无痕模式
   */
  private static isIncognito(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      // 尝试访问 localStorage
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return false;
    } catch {
      return true;
    }
  }
}

/**
 * 敏感内容检测（增强版）
 */
export class SensitiveContentDetector {
  private static patterns = [
    // 邮箱地址
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // 手机号（中国）
    /1[3-9]\d{9}/g,
    // 身份证号（简化版）
    /\d{17}[\dXx]/g,
    // 银行卡号（简化版）
    /\d{16,19}/g,
    // IP 地址
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    // 密码关键词
    /(password|passwd|pwd)\s*[:=]\s*\S+/gi,
    // API 密钥（简化）
    /(api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*\S+/gi
  ];

  /**
   * 检测文本中的敏感信息
   */
  static detect(text: string): {
    hasSensitive: boolean;
    types: string[];
    count: number;
  } {
    const detectedTypes = new Set<string>();
    let totalCount = 0;

    this.patterns.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches) {
        totalCount += matches.length;
        const types = ['Email', 'Phone', 'ID', 'Card', 'IP', 'Password', 'API Key'];
        detectedTypes.add(types[index] || 'Unknown');
      }
    });

    return {
      hasSensitive: totalCount > 0,
      types: Array.from(detectedTypes),
      count: totalCount
    };
  }

  /**
   * 模糊敏感内容
   */
  static mask(text: string): string {
    let masked = text;

    // 模糊邮箱
    masked = masked.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match, username, domain) => {
      const maskedUsername = username[0] + '*'.repeat(username.length - 1);
      return `${maskedUsername}@${domain}`;
    });

    // 模糊手机号
    masked = masked.replace(/1[3-9]\d{9}/g, match => {
      return match.substring(0, 3) + '****' + match.substring(7);
    });

    // 模糊身份证
    masked = masked.replace(/\d{17}[\dXx]/g, match => {
      return match.substring(0, 6) + '********' + match.substring(14);
    });

    return masked;
  }
}

/**
 * 紧急销毁工具
 */
export class EmergencyDestroyer {
  /**
   * 立即销毁所有数据
   */
  static destroyAll(): void {
    // 清除内存
    if (typeof window !== 'undefined') {
      // 清除所有消息
      const messages = document.querySelectorAll('[data-message]');
      messages.forEach(msg => msg.remove());

      // 清除剪贴板
      navigator.clipboard.writeText('');

      // 清除会话存储
      sessionStorage.clear();

      // 清除特定的 localStorage
      localStorage.removeItem('ghostchat_peer_id');
      localStorage.removeItem('ghostchat_peer_id_timestamp');

      // 清除定时器
      const timers = (window as any).emergencyTimers || [];
      timers.forEach((timer: NodeJS.Timeout) => clearTimeout(timer));

      // 显示销毁确认
      alert('所有数据已销毁。关闭标签页以完成清理。');

      // 跳转到首页
      window.location.href = '/';
    }
  }

  /**
   * 注册紧急销毁快捷键（Ctrl+Shift+X）
   */
  static registerEmergencyShortcut(): void {
    if (typeof document !== 'undefined') {
      const handler = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'X') {
          e.preventDefault();
          this.destroyAll();
        }
      };

      document.addEventListener('keydown', handler);

      return () => document.removeEventListener('keydown', handler);
    }
  }
}
