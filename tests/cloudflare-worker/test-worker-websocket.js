// Direct WebSocket test for Cloudflare Worker
// Run with: node test-worker-websocket.js

const WebSocket = require('ws');

const WORKER_URL = 'wss://ghostchat-signaling.teycir.workers.dev/peerjs';

function testWorker() {
  return new Promise((resolve) => {
    console.log('Testing Cloudflare Worker WebSocket...\n');
    
    const id1 = 'test-peer-1';
    const id2 = 'test-peer-2';
    
    const ws1 = new WebSocket(`${WORKER_URL}?key=peerjs&id=${id1}&token=test1&version=1.5.5`);
    let ws2 = null;
    
    const timeout = setTimeout(() => {
      console.log('❌ TIMEOUT');
      ws1.close();
      if (ws2) ws2.close();
      resolve(false);
    }, 10000);
    
    ws1.on('open', () => {
      console.log('✓ WS1 connected');
    });
    
    ws1.on('message', (data) => {
      const msg = JSON.parse(data);
      console.log('WS1 received:', msg);
      
      if (msg.type === 'OPEN') {
        console.log('✓ WS1 got OPEN message');
        
        // Now connect second peer
        ws2 = new WebSocket(`${WORKER_URL}?key=peerjs&id=${id2}&token=test2&version=1.5.5`);
        
        ws2.on('open', () => {
          console.log('✓ WS2 connected');
        });
        
        ws2.on('message', (data) => {
          const msg = JSON.parse(data);
          console.log('WS2 received:', msg);
          
          if (msg.type === 'OPEN') {
            console.log('✓ WS2 got OPEN message');
            
            // Send test message from WS2 to WS1
            const testMsg = {
              type: 'OFFER',
              src: id2,
              dst: id1,
              payload: { test: 'hello' }
            };
            
            console.log('\nSending test message from WS2 to WS1...');
            console.log('Message:', testMsg);
            ws2.send(JSON.stringify(testMsg));
          } else if (msg.src === id1) {
            console.log('✓ WS2 received message from WS1');
          }
        });
        
        ws2.on('error', (err) => {
          console.log('❌ WS2 error:', err.message);
          clearTimeout(timeout);
          ws1.close();
          ws2.close();
          resolve(false);
        });
      } else if (msg.src === id2) {
        console.log('✅ SUCCESS - WS1 received message from WS2!');
        console.log('Message payload:', msg.payload);
        clearTimeout(timeout);
        ws1.close();
        ws2.close();
        resolve(true);
      }
    });
    
    ws1.on('error', (err) => {
      console.log('❌ WS1 error:', err.message);
      clearTimeout(timeout);
      ws1.close();
      if (ws2) ws2.close();
      resolve(false);
    });
    
    ws1.on('close', () => {
      console.log('WS1 closed');
    });
  });
}

testWorker().then(success => {
  console.log('\n' + '='.repeat(50));
  console.log(success ? '✅ TEST PASSED' : '❌ TEST FAILED');
  console.log('='.repeat(50));
  process.exit(success ? 0 : 1);
});
