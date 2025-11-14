import { test, expect } from '@playwright/test';

test('Worker cascade: fails over to backup worker', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('about:blank');
  await page.addScriptTag({ url: 'https://unpkg.com/simple-peer@9.11.1/simplepeer.min.js' });
  
  console.log('Testing worker cascade fallback...\n');
  
  const result = await page.evaluate(async () => {
    const workers = [
      'wss://invalid-worker-12345.workers.dev/peerjs/peerjs',
      'wss://ghostchat-signaling.teycir.workers.dev/peerjs/peerjs',
    ];
    
    const logs: string[] = [];
    
    for (let i = 0; i < workers.length; i++) {
      const workerUrl = workers[i];
      logs.push(`Trying worker ${i + 1}: ${workerUrl}`);
      
      try {
        const myId = Math.random().toString(36).substr(2, 9);
        const ws = new WebSocket(`${workerUrl}?key=peerjs&id=${myId}&token=token`);
        
        const connected = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve(false);
          }, 3000);
          
          ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          };
          
          ws.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
          };
        });
        
        if (connected) {
          logs.push(`✅ Worker ${i + 1} SUCCESS`);
          return { success: true, workerIndex: i, logs };
        } else {
          logs.push(`❌ Worker ${i + 1} FAILED`);
        }
      } catch (err) {
        logs.push(`❌ Worker ${i + 1} ERROR: ${err}`);
      }
    }
    
    return { success: false, workerIndex: -1, logs };
  });
  
  result.logs.forEach(log => console.log(log));
  
  console.log(`\n=== RESULT ===`);
  console.log(`Success: ${result.success}`);
  console.log(`Connected to worker: ${result.workerIndex + 1}`);
  
  expect(result.success).toBe(true);
  expect(result.workerIndex).toBe(1);
  
  await context.close();
});
