const WebSocket = require('ws');

const WORKER_URL = 'wss://ghostchat-signaling.teycir.workers.dev';

async function testInvalidScenarios() {
  console.log('Testing invalid message scenarios...\n');
  
  const peer1 = new WebSocket(`${WORKER_URL}/peerjs/peerjs?key=peerjs&id=valid1&token=test1`);
  const peer2 = new WebSocket(`${WORKER_URL}/peerjs/peerjs?key=peerjs&id=valid2&token=test2`);
  
  let peer1Messages = [];
  let peer2Messages = [];
  
  peer1.on('message', (data) => {
    const msg = JSON.parse(data);
    peer1Messages.push(msg);
    if (msg.type !== 'OPEN') console.log('[PEER1] Received:', msg.type);
  });
  
  peer2.on('message', (data) => {
    const msg = JSON.parse(data);
    peer2Messages.push(msg);
    if (msg.type !== 'OPEN') console.log('[PEER2] Received:', msg.type);
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('1. Sending message to non-existent peer...');
  peer1.send(JSON.stringify({ type: 'TEST', src: 'valid1', dst: 'nonexistent', payload: 'test' }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('2. Sending message without dst field...');
  peer1.send(JSON.stringify({ type: 'TEST', src: 'valid1', payload: 'no-dst' }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('3. Sending valid message...');
  peer1.send(JSON.stringify({ type: 'VALID', src: 'valid1', dst: 'valid2', payload: 'should-work' }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('4. Sending malformed JSON (should not crash worker)...');
  try {
    peer1.send('not-json-at-all');
  } catch (e) {
    console.log('   Client error (expected):', e.message);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('5. Sending empty dst field...');
  peer1.send(JSON.stringify({ type: 'TEST', src: 'valid1', dst: '', payload: 'empty-dst' }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  peer1.close();
  peer2.close();
  
  console.log('\n=== RESULTS ===');
  console.log('Peer1 messages:', peer1Messages.length);
  console.log('Peer2 messages:', peer2Messages.length);
  
  const peer2GotValid = peer2Messages.some(m => m.type === 'VALID');
  const peer2OnlyGotValid = peer2Messages.filter(m => m.type !== 'OPEN').length === 1;
  
  if (peer2GotValid && peer2OnlyGotValid) {
    console.log('\n✅ INVALID SCENARIOS TEST PASSED - Only valid message delivered');
  } else {
    console.log('\n❌ INVALID SCENARIOS TEST FAILED');
    console.log('Peer2 got valid message:', peer2GotValid);
    console.log('Peer2 only got valid message:', peer2OnlyGotValid);
  }
}

testInvalidScenarios().catch(console.error);
