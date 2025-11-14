const WebSocket = require('ws');

const WORKER_URL = 'wss://ghostchat-signaling.teycir.workers.dev';

async function testStressLoad() {
  console.log('Testing stress load with rapid messages...\n');
  
  const peer1 = new WebSocket(`${WORKER_URL}/peerjs/peerjs?key=peerjs&id=stress1&token=test1`);
  const peer2 = new WebSocket(`${WORKER_URL}/peerjs/peerjs?key=peerjs&id=stress2&token=test2`);
  
  let peer1Count = 0;
  let peer2Count = 0;
  
  peer1.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type !== 'OPEN') peer1Count++;
  });
  
  peer2.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type !== 'OPEN') peer2Count++;
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('Sending 50 rapid messages from peer2 -> peer1...');
  for (let i = 0; i < 50; i++) {
    peer2.send(JSON.stringify({ type: 'DATA', src: 'stress2', dst: 'stress1', payload: `msg-${i}` }));
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('Sending 50 rapid messages from peer1 -> peer2...');
  for (let i = 0; i < 50; i++) {
    peer1.send(JSON.stringify({ type: 'DATA', src: 'stress1', dst: 'stress2', payload: `msg-${i}` }));
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  peer1.close();
  peer2.close();
  
  console.log('\n=== RESULTS ===');
  console.log('Peer1 received:', peer1Count, '/ 50');
  console.log('Peer2 received:', peer2Count, '/ 50');
  
  if (peer1Count === 50 && peer2Count === 50) {
    console.log('\n✅ STRESS TEST PASSED - All messages delivered');
  } else {
    console.log('\n⚠️  STRESS TEST PARTIAL - Some messages lost');
    console.log('Loss rate:', ((100 - peer1Count) + (100 - peer2Count)) / 2, '%');
  }
}

testStressLoad().catch(console.error);
