import { test, expect } from '@playwright/test';

test('simple-peer: verify P2P connection (not just relay)', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  await page1.goto('about:blank');
  await page2.goto('about:blank');
  
  await page1.addScriptTag({ url: 'https://unpkg.com/simple-peer@9.11.1/simplepeer.min.js' });
  await page2.addScriptTag({ url: 'https://unpkg.com/simple-peer@9.11.1/simplepeer.min.js' });
  
  console.log('Step 1: Peer1 connecting...');
  
  const peer1Id = await page1.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const myId = Math.random().toString(36).substr(2, 9);
      const ws = new WebSocket(`wss://ghostchat-signaling.teycir.workers.dev/peerjs/peerjs?key=peerjs&id=${myId}&token=token`);
      
      (window as any).ws1 = ws;
      (window as any).myId1 = myId;
      (window as any).p2pConnected = false;
      
      ws.onopen = () => resolve(myId);
      ws.onerror = () => reject(new Error('WebSocket error'));
      setTimeout(() => reject(new Error('timeout')), 10000);
    });
  });
  
  console.log(`✅ Peer1: ${peer1Id}`);
  
  console.log('Step 2: Peer2 connecting...');
  
  const peer2Id = await page2.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const myId = Math.random().toString(36).substr(2, 9);
      const ws = new WebSocket(`wss://ghostchat-signaling.teycir.workers.dev/peerjs/peerjs?key=peerjs&id=${myId}&token=token`);
      
      (window as any).ws2 = ws;
      (window as any).myId2 = myId;
      (window as any).p2pConnected = false;
      
      ws.onopen = () => resolve(myId);
      ws.onerror = () => reject(new Error('WebSocket error'));
      setTimeout(() => reject(new Error('timeout')), 10000);
    });
  });
  
  console.log(`✅ Peer2: ${peer2Id}`);
  
  console.log('Step 3: Setting up Peer1 (receiver)...');
  
  const peer1Result = page1.evaluate(() => {
    return new Promise<{ p2pConnected: boolean; message: string }>((resolve) => {
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
              console.log('✅ Peer1: P2P CONNECTED');
              (window as any).p2pConnected = true;
            });
            
            (window as any).peer1.on('data', (data: any) => {
              resolve({
                p2pConnected: (window as any).p2pConnected,
                message: data.toString()
              });
            });
          }
          
          (window as any).peer1.signal(msg.signal);
        }
      };
    });
  });
  
  console.log('Step 4: Peer2 initiating P2P connection...');
  
  const peer2Connected = await page2.evaluate((targetId) => {
    return new Promise<boolean>((resolve, reject) => {
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
        console.log('✅ Peer2: P2P CONNECTED');
        (window as any).p2pConnected = true;
        peer.send('Hello via P2P!');
        resolve(true);
      });
      
      peer.on('error', (err: Error) => reject(err));
      
      ws.onmessage = (event: MessageEvent) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'SIGNAL' && msg.signal) {
          peer.signal(msg.signal);
        }
      };
      
      setTimeout(() => reject(new Error('timeout')), 15000);
    });
  }, peer1Id);
  
  console.log(`✅ Peer2 P2P connected: ${peer2Connected}`);
  
  const result = await peer1Result;
  
  console.log(`✅ Peer1 P2P connected: ${result.p2pConnected}`);
  console.log(`✅ Message received: "${result.message}"`);
  
  console.log('\n=== VERIFICATION ===');
  console.log(`P2P Connection Established: ${result.p2pConnected && peer2Connected}`);
  console.log(`Message via P2P: ${result.message === 'Hello via P2P!'}`);
  
  expect(result.p2pConnected).toBe(true);
  expect(peer2Connected).toBe(true);
  expect(result.message).toBe('Hello via P2P!');
  
  await context1.close();
  await context2.close();
});
