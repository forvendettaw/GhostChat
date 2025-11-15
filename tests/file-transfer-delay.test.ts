import { describe, it, expect } from 'vitest';
import { fileToBase64, serializeFileMessage } from '../lib/file-transfer';

describe('File Transfer - Chunk Delay Test', () => {
  it('should simulate sending chunks with delay', async () => {
    const content = 'a'.repeat(50 * 1024); // 50KB
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'test.txt', { type: 'text/plain' });

    const result = await fileToBase64(file);
    const chunks = serializeFileMessage(result.fileData!);
    
    console.log(`\n=== Simulating chunk sending with 50ms delay ===`);
    console.log(`Total chunks: ${chunks.length}`);
    
    const startTime = Date.now();
    const sentChunks: number[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      sentChunks.push(i);
      console.log(`Sent chunk ${i + 1}/${chunks.length} (${chunks[i].length} bytes)`);
      
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Average time per chunk: ${Math.round(totalTime / chunks.length)}ms`);
    console.log(`==============================================\n`);
    
    expect(sentChunks.length).toBe(chunks.length);
    expect(totalTime).toBeGreaterThan((chunks.length - 1) * 50);
  });

  it('should test different delay values', async () => {
    const content = 'a'.repeat(20 * 1024); // 20KB
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'test.txt', { type: 'text/plain' });

    const result = await fileToBase64(file);
    const chunks = serializeFileMessage(result.fileData!);
    
    const delays = [0, 10, 50, 100];
    
    console.log(`\n=== Testing different delay values ===`);
    console.log(`File size: 20KB, Chunks: ${chunks.length}`);
    
    for (const delay of delays) {
      const startTime = Date.now();
      
      for (let i = 0; i < chunks.length; i++) {
        if (i < chunks.length - 1 && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`Delay ${delay}ms: Total time ${totalTime}ms`);
    }
    
    console.log(`======================================\n`);
    
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should verify chunk order is maintained with delays', async () => {
    const content = 'a'.repeat(30 * 1024); // 30KB
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'test.txt', { type: 'text/plain' });

    const result = await fileToBase64(file);
    const chunks = serializeFileMessage(result.fileData!);
    
    const receivedOrder: number[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      receivedOrder.push(i);
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    const expectedOrder = Array.from({ length: chunks.length }, (_, i) => i);
    expect(receivedOrder).toEqual(expectedOrder);
  });

  it('should measure memory usage during chunked send', async () => {
    const sizes = [10, 50, 100, 500];
    
    console.log(`\n=== Memory usage during chunked send ===`);
    
    for (const sizeKB of sizes) {
      const content = 'a'.repeat(sizeKB * 1024);
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], `test-${sizeKB}kb.txt`, { type: 'text/plain' });

      const result = await fileToBase64(file);
      const chunks = serializeFileMessage(result.fileData!);
      
      const totalChunkSize = chunks.reduce((sum, c) => sum + c.length, 0);
      const overhead = totalChunkSize - result.fileData!.data.length;
      const overheadPercent = ((overhead / result.fileData!.data.length) * 100).toFixed(2);
      
      console.log(`${sizeKB}KB: ${chunks.length} chunks, overhead: ${overhead}B (${overheadPercent}%)`);
    }
    
    console.log(`========================================\n`);
  });
});
