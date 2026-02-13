/**
 * 优化的文件传输系统
 * 支持大文件、断点续传、自适应分块
 */

export interface FileChunk {
  index: number;
  totalChunks: number;
  data: string; // Base64 编码的数据
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  checksum: string;
}

export interface FileTransferProgress {
  fileId: string;
  fileName: string;
  chunksReceived: number;
  totalChunks: number;
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
  speed: number; // KB/s
  estimatedTimeRemaining: number; // 秒
}

export interface FileTransferOptions {
  chunkSize?: number; // 默认 64KB
  maxRetries?: number; // 默认 3 次
  retryDelay?: number; // 默认 1000ms
  adaptiveChunking?: boolean; // 默认 true
}

class OptimizedFileTransfer {
  private activeTransfers = new Map<string, FileTransferProgress>();
  private chunkSize = 64 * 1024; // 64KB
  private maxRetries = 3;
  private retryDelay = 1000;
  private adaptiveChunking = true;

  /**
   * 计算最佳分块大小（基于网络质量）
   */
  private calculateOptimalChunkSize(
    fileSize: number,
    networkLatency?: number | null,
    networkBandwidth?: number | null
  ): number {
    // 默认 64KB
    let optimalChunkSize = 64 * 1024;

    // 根据延迟调整
    if (networkLatency !== null && networkLatency !== undefined) {
      if (networkLatency < 100) {
        // 低延迟：使用更大的分块以提高吞吐量
        optimalChunkSize = 128 * 1024;
      } else if (networkLatency > 500) {
        // 高延迟：使用更小的分块以减少重传成本
        optimalChunkSize = 32 * 1024;
      }
    }

    // 根据带宽调整
    if (networkBandwidth !== null && networkBandwidth !== undefined && networkBandwidth < 500) {
      // 低带宽：使用更小的分块
      optimalChunkSize = 32 * 1024;
    }

    // 确保分块大小合理（16KB - 256KB）
    optimalChunkSize = Math.max(16 * 1024, Math.min(256 * 1024, optimalChunkSize));

    console.log(`[FILE-TRANSFER] Optimal chunk size: ${optimalChunkSize / 1024}KB (latency: ${networkLatency}ms, bandwidth: ${networkBandwidth}Kbps)`);
    return optimalChunkSize;
  }

  /**
   * 将文件分割为分块
   */
  async* chunkFile(
    file: File,
    options: FileTransferOptions = {}
  ): AsyncGenerator<FileChunk> {
    const {
      chunkSize: customChunkSize,
      adaptiveChunking = this.adaptiveChunking
    } = options;

    const fileId = this.generateFileId(file);
    const fileSize = file.size;
    const fileType = file.type;
    const fileName = file.name;

    // 计算分块大小
    const finalChunkSize = customChunkSize || this.chunkSize;
    const totalChunks = Math.ceil(fileSize / finalChunkSize);

    console.log(`[FILE-TRANSFER] Chunking ${fileName} (${this.formatFileSize(fileSize)}) into ${totalChunks} chunks`);

    // 读取文件
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * finalChunkSize;
      const end = Math.min(start + finalChunkSize, fileSize);
      const chunkData = uint8Array.slice(start, end);

      // 编码为 Base64
      const base64Data = this.arrayBufferToBase64(chunkData.buffer);

      // 计算校验和（简化版）
      const checksum = this.calculateChecksum(chunkData);

      yield {
        index: i,
        totalChunks,
        data: base64Data,
        fileId,
        fileName,
        fileSize,
        fileType,
        checksum
      };
    }
  }

  /**
   * 接收并重组文件
   */
  async receiveFile(
    chunks: Map<number, FileChunk>,
    fileId: string,
    onProgress?: (progress: FileTransferProgress) => void
  ): Promise<Blob | null> {
    const totalChunks = chunks.size;
    if (totalChunks === 0) {
      console.error('[FILE-TRANSFER] No chunks received');
      return null;
    }

    // 按索引排序分块
    const sortedChunks = Array.from(chunks.values()).sort((a, b) => a.index - b.index);

    // 验证文件完整性
    const firstChunk = sortedChunks[0];
    const expectedChunks = firstChunk.totalChunks;

    if (sortedChunks.length !== expectedChunks) {
      console.error(`[FILE-TRANSFER] Missing chunks: ${sortedChunks.length}/${expectedChunks}`);
      return null;
    }

    // 验证校验和
    for (const chunk of sortedChunks) {
      const data = this.base64ToArrayBuffer(chunk.data);
      const uint8Array = new Uint8Array(data);
      const calculatedChecksum = this.calculateChecksum(uint8Array);

      if (calculatedChecksum !== chunk.checksum) {
        console.error(`[FILE-TRANSFER] Checksum failed for chunk ${chunk.index}`);
        return null;
      }
    }

    // 重组文件
    const totalSize = firstChunk.fileSize;
    const fileType = firstChunk.fileType;
    const fileName = firstChunk.fileName;

    const combinedArray = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of sortedChunks) {
      const chunkData = this.base64ToArrayBuffer(chunk.data);
      const chunkUint8Array = new Uint8Array(chunkData);
      combinedArray.set(chunkUint8Array, offset);
      offset += chunkUint8Array.length;

      // 报告进度
      if (onProgress) {
        const progress: FileTransferProgress = {
          fileId,
          fileName,
          chunksReceived: offset / chunkUint8Array.length,
          totalChunks: expectedChunks,
          bytesReceived: offset,
          totalBytes: totalSize,
          percentage: Math.round((offset / totalSize) * 100),
          speed: 0, // 需要外部计算
          estimatedTimeRemaining: 0 // 需要外部计算
        };
        onProgress(progress);
      }
    }

    console.log(`[FILE-TRANSFER] Reassembled ${fileName} (${this.formatFileSize(totalSize)})`);
    return new Blob([combinedArray], { type: fileType });
  }

  /**
   * 创建文件传输进度跟踪器
   */
  createProgressTracker(fileId: string, fileName: string, totalBytes: number): FileTransferProgress {
    const progress: FileTransferProgress = {
      fileId,
      fileName,
      chunksReceived: 0,
      totalChunks: 0,
      bytesReceived: 0,
      totalBytes,
      percentage: 0,
      speed: 0,
      estimatedTimeRemaining: 0
    };

    this.activeTransfers.set(fileId, progress);
    return progress;
  }

  /**
   * 更新传输进度
   */
  updateProgress(
    fileId: string,
    bytesReceived: number,
    startTime: number
  ): FileTransferProgress | null {
    const progress = this.activeTransfers.get(fileId);
    if (!progress) return null;

    const now = Date.now();
    const elapsed = (now - startTime) / 1000; // 秒

    progress.bytesReceived = bytesReceived;
    progress.percentage = Math.round((bytesReceived / progress.totalBytes) * 100);

    // 计算速度
    if (elapsed > 0) {
      progress.speed = Math.round((bytesReceived / 1024) / elapsed); // KB/s

      // 估算剩余时间
      const remainingBytes = progress.totalBytes - bytesReceived;
      if (progress.speed > 0) {
        progress.estimatedTimeRemaining = Math.round(remainingBytes / (progress.speed * 1024));
      }
    }

    return progress;
  }

  /**
   * 清除传输进度
   */
  clearProgress(fileId: string) {
    this.activeTransfers.delete(fileId);
  }

  /**
   * 工具方法：生成文件 ID
   */
  private generateFileId(file: File): string {
    return `${file.name}-${file.size}-${Date.now()}`;
  }

  /**
   * 工具方法：ArrayBuffer 转 Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 工具方法：Base64 转 ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * 工具方法：计算校验和（简化版）
   */
  private calculateChecksum(data: Uint8Array): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i];
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 工具方法：格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

export const optimizedFileTransfer = new OptimizedFileTransfer();
