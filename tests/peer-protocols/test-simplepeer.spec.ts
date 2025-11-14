import { test, expect } from '@playwright/test';

test('simple-peer: 2 peers connect via Cloudflare and exchange messages', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  await page1.goto('about:blank');
  await page2.goto('about:blank');
  
  console.log('Step 1: Injecting simple-peer library...');
  
  await page1.addScriptTag({ url: 'https://unpkg.com/simple-peer@9.11.1/simplepeer.min.js' });
  await page2.addScriptTag({ url: 'https://unpkg.com/simple-peer@9.11.1/simplepeer.min.js' });
  
  console.log('Step 2: Peer1 connecting to Cloudflare Worker...');
  
  const peer1Id = await page1.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const myId = Math.random().toString(36).substr(2, 9);
      const ws = new WebSocket(`wss://ghostchat-signaling.teycir.workers.dev/peerjs/peerjs?key=peerjs&id=${myId}&token=token`);
      
      (window as any).ws1 = ws;
      (window as any).myId1 = myId;
      
      ws.onopen = () => {
        console.log('Peer1 WebSocket connected:', myId);
        resolve(myId);
      };
      
      ws.onerror = () => reject(new Error('Peer1 WebSocket error'));
      
      setTimeout(() => reject(new Error('Peer1 timeout')), 10000);
    });
  });
  
  console.log(`✅ Peer1 connected: ${peer1Id}`);
  
  console.log('Step 3: Peer2 connecting to Cloudflare Worker...');
  
  const peer2Id = await page2.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const myId = Math.random().toString(36).substr(2, 9);
      const ws = new WebSocket(`wss://ghostchat-signaling.teycir.workers.dev/peerjs/peerjs?key=peerjs&id=${myId}&token=token`);
      
      (window as any).ws2 = ws;
      (window as any).myId2 = myId;
      
      ws.onopen = () => {
        console.log('Peer2 WebSocket connected:', myId);
        resolve(myId);
      };
      
      ws.onerror = () => reject(new Error('Peer2 WebSocket error'));
      
      setTimeout(() => reject(new Error('Peer2 timeout')), 10000);
    });
  });
  
  console.log(`✅ Peer2 connected: ${peer2Id}`);
  
  console.log('Step 4: Setting up Peer1 to receive connection...');
  
  const messagePromise = page1.evaluate(() => {
    return new Promise<string>((resolve) => {
      const SimplePeer = (window as any).SimplePeer;
      const ws = (window as any).ws1;
      
      ws.onmessage = (event: MessageEvent) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'SIGNAL' && msg.signal) {
          if (!(window as any).peer1) {
            (window as any).peer1 = new SimplePeer({ initiator: false });
            
            (window as any).peer1.on('signal', (signal: any) => {
              ws.send(JSON.stringify({
                type: 'SIGNAL',
                src: (window as any).myId1,
                dst: msg.src,
                signal
              }));
            });
            
            (window as any).peer1.on('connect', () => {
              console.log('Peer1 P2P connected');
            });
            
            (window as any).peer1.on('data', (data: any) => {
              console.log('Peer1 received:', data.toString());
              resolve(data.toString());
            });
          }
          
          (window as any).peer1.signal(msg.signal);
        }
      };
    });
  });
  
  console.log('Step 5: Peer2 initiating connection to Peer1...');
  
  await page2.evaluate((targetId) => {
    return new Promise<void>((resolve, reject) => {
      const SimplePeer = (window as any).SimplePeer;
      const ws = (window as any).ws2;
      const myId = (window as any).myId2;
      
      const peer = new SimplePeer({ initiator: true });
      (window as any).peer2 = peer;
      
      peer.on('signal', (signal: any) => {
        ws.send(JSON.stringify({
          type: 'SIGNAL',
          src: myId,
          dst: targetId,
          signal
        }));
      });
      
      peer.on('connect', () => {
        console.log('Peer2 P2P connected, sending message');
        peer.send('Hello from Peer2!');
        resolve();
      });
      
      peer.on('error', (err: Error) => {
        reject(err);
      });
      
      ws.onmessage = (event: MessageEvent) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'SIGNAL' && msg.signal) {
          peer.signal(msg.signal);
        }
      };
      
      setTimeout(() => reject(new Error('Peer2 connection timeout')), 15000);
    });
  }, peer1Id);
  
  console.log('✅ Peer2 sent message');
  
  console.log('Step 6: Waiting for Peer1 to receive message...');
  
  const receivedMessage = await messagePromise;
  
  console.log(`✅ Peer1 received: "${receivedMessage}"`);
  console.log('\n=== TEST PASSED ===');
  console.log('✅ Peers connected via Cloudflare Worker');
  console.log('✅ Message exchanged successfully');
  
  expect(receivedMessage).toBe('Hello from Peer2!');
  
  await context1.close();
  await context2.close();
});
