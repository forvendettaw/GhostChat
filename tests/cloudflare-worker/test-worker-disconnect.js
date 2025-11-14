const WebSocket = require('ws');

const WORKER_URL = 'wss://ghostchat-signaling.teycir.workers.dev';

async function testDisconnectScenario() {
  console.log('Testing disconnect and reconnect scenarios...\n');
  
  console.log('1. Peer1 connects...');
  const peer1 = new WebSocket(`${WORKER_URL}/peerjs/peerjs?key=peerjs&id=disco1&token=test1`);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('2. Peer2 connects...');
  const peer2 = new WebSocket(`${WORKER_URL}/peerjs/peerjs?key=peerjs&id=disco2&token=test2`);
  
  let peer1Messages = [];
  let peer2Messages = [];
  
  peer1.on('message', (data) => {
    const msg = JSON.parse(data);
    peer1Messages.push(msg);
    console.log('[PEER1] Received:', msg.type);
  });
  
  peer2.on('message', (data) => {
    const msg = JSON.parse(data);
    peer2Messages.push(msg);
    console.log('[PEER2] Received:', msg.type);
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('\n3. Peer2 sends message to Peer1...');
  peer2.send(JSON.stringify({ type: 'TEST1', src: 'disco2', dst: 'disco1', payload: 'before-disconnect' }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('4. Peer1 disconnects...');
  peer1.close();
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('5. Peer2 tries to send to disconnected Peer1 (should fail silently)...');
  peer2.send(JSON.stringify({ type: 'TEST2', src: 'disco2', dst: 'disco1', payload: 'after-disconnect' }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('6. Peer1 reconnects with same ID...');
  const peer1New = new WebSocket(`${WORKER_URL}/peerjs/peerjs?key=peerjs&id=disco1&token=test3`);
  
  let peer1NewMessages = [];
  peer1New.on('message', (data) => {
    const msg = JSON.parse(data);
    peer1NewMessages.push(msg);
    console.log('[PEER1-NEW] Received:', msg.type);
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('7. Peer2 sends to reconnected Peer1...');
  peer2.send(JSON.stringify({ type: 'TEST3', src: 'disco2', dst: 'disco1', payload: 'after-reconnect' }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  peer1New.close();
  peer2.close();
  
  console.log('\n=== RESULTS ===');
  console.log('Peer1 (before disconnect) messages:', peer1Messages.length);
  console.log('Peer1 (after reconnect) messages:', peer1NewMessages.length);
  console.log('Peer2 messages:', peer2Messages.length);
  
  const gotBeforeDisconnect = peer1Messages.some(m => m.type === 'TEST1');
  const gotAfterReconnect = peer1NewMessages.some(m => m.type === 'TEST3');
  
  if (gotBeforeDisconnect && gotAfterReconnect) {
    console.log('\n✅ DISCONNECT TEST PASSED');
  } else {
    console.log('\n❌ DISCONNECT TEST FAILED');
    console.log('Got before disconnect:', gotBeforeDisconnect);
    console.log('Got after reconnect:', gotAfterReconnect);
  }
}

testDisconnectScenario().catch(console.error);
