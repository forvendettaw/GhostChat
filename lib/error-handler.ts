/**
 * 增强的错误处理系统
 * 提供更友好的错误提示和自动恢复
 */

export enum ErrorCategory {
  NETWORK = 'network',
  WEBRTC = 'webrtc',
  PEER = 'peer',
  FILE_TRANSFER = 'file_transfer',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

export interface AppError {
  code: string;
  category: ErrorCategory;
  message: string;
  userMessage: string;
  suggestion: string;
  recoverable: boolean;
  timestamp: number;
}

const ERROR_MESSAGES: Record<string, Partial<AppError>> = {
  // WebSocket 错误
  'WS_CONNECTION_FAILED': {
    category: ErrorCategory.NETWORK,
    message: '无法连接到信令服务器',
    userMessage: '连接服务器失败，正在尝试备用服务器...',
    suggestion: '请检查网络连接，或稍后重试',
    recoverable: true
  },
  'WS_TIMEOUT': {
    category: ErrorCategory.NETWORK,
    message: '连接超时',
    userMessage: '连接超时，请检查网络',
    suggestion: '网络可能较慢，请等待或切换网络',
    recoverable: true
  },

  // WebRTC 错误
  'WEBRTC_NOT_SUPPORTED': {
    category: ErrorCategory.WEBRTC,
    message: '浏览器不支持 WebRTC',
    userMessage: '您的浏览器不支持此功能',
    suggestion: '请使用最新版的 Chrome、Firefox、Safari 或 Edge',
    recoverable: false
  },
  'ICE_CONNECTION_FAILED': {
    category: ErrorCategory.WEBRTC,
    message: 'ICE 连接失败',
    userMessage: '无法建立 P2P 连接',
    suggestion: '两个设备可能都在 NAT 网络中，请尝试关闭 VPN',
    recoverable: true
  },
  'ICE_TIMEOUT': {
    category: ErrorCategory.WEBRTC,
    message: 'ICE 握手超时',
    userMessage: '连接超时，正在尝试其他方式...',
    suggestion: '网络可能不稳定，请稍后重试',
    recoverable: true
  },

  // Peer 错误
  'PEER_UNAVAILABLE': {
    category: ErrorCategory.PEER,
    message: '对方不在线',
    userMessage: '对方尚未上线，请稍后',
    suggestion: '确保对方已打开聊天链接',
    recoverable: true
  },
  'PEER_DISCONNECTED': {
    category: ErrorCategory.PEER,
    message: '对方已断开连接',
    userMessage: '对方已离开聊天',
    suggestion: '',
    recoverable: false
  },

  // 文件传输错误
  'FILE_TOO_LARGE': {
    category: ErrorCategory.FILE_TRANSFER,
    message: '文件过大',
    userMessage: '文件超过 10MB 限制',
    suggestion: '请使用更小的文件或压缩后重试',
    recoverable: true
  },
  'FILE_TRANSFER_FAILED': {
    category: ErrorCategory.FILE_TRANSFER,
    message: '文件传输失败',
    userMessage: '文件传输中断',
    suggestion: '请重试或检查网络连接',
    recoverable: true
  },

  // 权限错误
  'PERMISSION_DENIED': {
    category: ErrorCategory.PERMISSION,
    message: '权限被拒绝',
    userMessage: '无法访问必要的权限',
    suggestion: '请检查浏览器权限设置',
    recoverable: false
  }
};

/**
 * 创建标准化的错误对象
 */
export function createError(
  code: string,
  originalError?: Error | string,
  context?: Record<string, any>
): AppError {
  const template = ERROR_MESSAGES[code] || {
    category: ErrorCategory.UNKNOWN,
    message: '未知错误',
    userMessage: '发生错误，请重试',
    suggestion: '如果问题持续，请刷新页面',
    recoverable: true
  };

  const errorMessage = originalError
    ? (typeof originalError === 'string' ? originalError : originalError.message)
    : '';

  return {
    code,
    category: template.category || ErrorCategory.UNKNOWN,
    message: template.message || '',
    userMessage: template.userMessage || '',
    suggestion: template.suggestion || '',
    recoverable: template.recoverable || false,
    timestamp: Date.now(),
    ...context,
    originalError: errorMessage
  } as AppError;
}

/**
 * 根据错误类型获取建议操作
 */
export function getRecoveryAction(error: AppError): string | null {
  if (!error.recoverable) {
    return null;
  }

  switch (error.category) {
    case ErrorCategory.NETWORK:
      return '正在尝试备用服务器...';
    case ErrorCategory.WEBRTC:
      return '正在尝试 TURN 中继...';
    case ErrorCategory.PEER:
      return '等待对方上线...';
    case ErrorCategory.FILE_TRANSFER:
      return '可以重新尝试传输';
    default:
      return '请稍后重试';
  }
}

/**
 * 错误日志记录器
 */
class ErrorLogger {
  private errors: AppError[] = [];
  private maxErrors = 50;

  log(error: AppError) {
    this.errors.push(error);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // 控制台输出
    console.error(`[ERROR] ${error.code}:`, error);

    // 发送到错误收集服务（可选）
    this.sendToErrorTracking(error);
  }

  getRecentErrors(count: number = 10): AppError[] {
    return this.errors.slice(-count);
  }

  clear() {
    this.errors = [];
  }

  private sendToErrorTracking(error: AppError) {
    // 这里可以集成 Sentry、LogRocket 等错误追踪服务
    // 例如：
    // if (typeof window !== 'undefined' && (window as any).Sentry) {
    //   (window as any).Sentry.captureException(error);
    // }
  }
}

export const errorLogger = new ErrorLogger();

/**
 * 用户友好的错误提示生成器
 */
export function getUserFriendlyMessage(error: AppError): string {
  let message = error.userMessage;

  if (error.suggestion) {
    message += `\n\n💡 建议：${error.suggestion}`;
  }

  const recoveryAction = getRecoveryAction(error);
  if (recoveryAction) {
    message += `\n\n⏳ ${recoveryAction}`;
  }

  return message;
}

/**
 * 自动重试管理器
 */
export class RetryManager {
  private retries = new Map<string, number>();
  private maxRetries = 3;
  private retryDelay = 2000; // 2 秒

  async retry<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T | null> {
    const currentRetry = this.retries.get(operation) || 0;

    if (currentRetry >= this.maxRetries) {
      console.error(`[RETRY] Max retries reached for ${operation}`);
      this.retries.delete(operation);
      return null;
    }

    try {
      const result = await fn();
      this.retries.delete(operation); // 成功则清除重试计数
      return result;
    } catch (error) {
      this.retries.set(operation, currentRetry + 1);
      console.warn(`[RETRY] Attempt ${currentRetry + 1}/${this.maxRetries} for ${operation}`);

      // 指数退避
      const delay = this.retryDelay * Math.pow(2, currentRetry);
      await new Promise(resolve => setTimeout(resolve, delay));

      return this.retry(operation, fn);
    }
  }

  reset(operation: string) {
    this.retries.delete(operation);
  }

  resetAll() {
    this.retries.clear();
  }
}

export const retryManager = new RetryManager();
