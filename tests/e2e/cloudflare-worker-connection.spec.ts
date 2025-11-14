import { test, expect } from '@playwright/test';

test('Cloudflare Worker: 2 peers connect and exchange messages', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  const results = { peer1Id: '', peer2Id: '', messageReceived: false };
  
  await page1.goto('about:blank');
  await page2.goto('about:blank');
  
  console.log('Step 1: Creating Peer1 with Cloudflare Worker...');
  
  const peer1Id = await page1.evaluate(async () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      script.onload = () => {
        const peer = new (window as any).Peer({
          host: 'ghostchat-signaling.teycir.workers.dev',
          port: 443,
          path: '/peerjs',
          secure: true
        });
        
        peer.on('open', (id: string) => {
          (window as any).peer1 = peer;
          resolve(id);
        });
        
        peer.on('error', (err: any) => {
          reject(new Error(`Peer1 error: ${err.type} - ${err.message}`));
        });
        
        setTimeout(() => reject(new Error('Peer1 timeout')), 10000);
      };
      document.head.appendChild(script);
    });
  });
  
  console.log(`✅ Peer1 connected: ${peer1Id}`);
  results.peer1Id = peer1Id;
  
  console.log('Step 2: Creating Peer2 with Cloudflare Worker...');
  
  const peer2Id = await page2.evaluate(async () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
      script.onload = () => {
        const peer = new (window as any).Peer({
          host: 'ghostchat-signaling.teycir.workers.dev',
          port: 443,
          path: '/peerjs',
          secure: true
        });
        
        peer.on('open', (id: string) => {
          (window as any).peer2 = peer;
          resolve(id);
        });
        
        peer.on('error', (err: any) => {
          reject(new Error(`Peer2 error: ${err.type} - ${err.message}`));
        });
        
        setTimeout(() => reject(new Error('Peer2 timeout')), 10000);
      };
      document.head.appendChild(script);
    });
  });
  
  console.log(`✅ Peer2 connected: ${peer2Id}`);
  results.peer2Id = peer2Id;
  
  console.log(`Step 3: Peer1 listening for connections...`);
  
  const messagePromise = page1.evaluate(() => {
    return new Promise((resolve) => {
      (window as any).peer1.on('connection', (conn: any) => {
        conn.on('data', (data: string) => {
          resolve(data);
        });
      });
    });
  });
  
  console.log(`Step 4: Peer2 connecting to Peer1 (${peer1Id})...`);
  
  await page2.evaluate((targetId) => {
    return new Promise((resolve, reject) => {
      const conn = (window as any).peer2.connect(targetId);
      
      conn.on('open', () => {
        conn.send('Hello from Peer2!');
        resolve(true);
      });
      
      conn.on('error', (err: any) => {
        reject(new Error(`Connection error: ${err}`));
      });
      
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
  }, peer1Id);
  
  console.log('✅ Peer2 sent message');
  
  console.log('Step 5: Waiting for Peer1 to receive message...');
  
  const receivedMessage = await messagePromise;
  
  console.log(`✅ Peer1 received: "${receivedMessage}"`);
  results.messageReceived = true;
  
  console.log('\n=== TEST PASSED ===');
  console.log('✅ Peers connected via Cloudflare Worker');
  console.log('✅ Message exchanged successfully');
  
  expect(receivedMessage).toBe('Hello from Peer2!');
  
  await context1.close();
  await context2.close();
});
