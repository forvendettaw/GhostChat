const WebSocket = require('ws');

const WORKER_URL = 'wss://ghostchat-signaling.teycir.workers.dev';

async function testMultiPeerRelay() {
  console.log('Testing 3-peer message relay...\n');
  
  const peer1 = new WebSocket(`${WORKER_URL}/peerjs/peerjs?key=peerjs&id=peer1&token=test1`);
  const peer2 = new WebSocket(`${WORKER_URL}/peerjs/peerjs?key=peerjs&id=peer2&token=test2`);
  const peer3 = new WebSocket(`${WORKER_URL}/peerjs/peerjs?key=peerjs&id=peer3&token=test3`);
  
  const messages = { peer1: [], peer2: [], peer3: [] };
  
  peer1.on('message', (data) => {
    const msg = JSON.parse(data);
    console.log('[PEER1] Received:', msg);
    messages.peer1.push(msg);
  });
  
  peer2.on('message', (data) => {
    const msg = JSON.parse(data);
    console.log('[PEER2] Received:', msg);
    messages.peer2.push(msg);
  });
  
  peer3.on('message', (data) => {
    const msg = JSON.parse(data);
    console.log('[PEER3] Received:', msg);
    messages.peer3.push(msg);
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\nSending peer3 -> peer1...');
  peer3.send(JSON.stringify({ type: 'OFFER', src: 'peer3', dst: 'peer1', payload: 'offer-data' }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('Sending peer1 -> peer3...');
  peer1.send(JSON.stringify({ type: 'ANSWER', src: 'peer1', dst: 'peer3', payload: 'answer-data' }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('Sending peer2 -> peer1...');
  peer2.send(JSON.stringify({ type: 'CANDIDATE', src: 'peer2', dst: 'peer1', payload: 'ice-candidate' }));
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  peer1.close();
  peer2.close();
  peer3.close();
  
  console.log('\n=== RESULTS ===');
  console.log('Peer1 messages:', messages.peer1.length);
  console.log('Peer2 messages:', messages.peer2.length);
  console.log('Peer3 messages:', messages.peer3.length);
  
  const peer1GotOffer = messages.peer1.some(m => m.type === 'OFFER' && m.src === 'peer3');
  const peer3GotAnswer = messages.peer3.some(m => m.type === 'ANSWER' && m.src === 'peer1');
  const peer1GotCandidate = messages.peer1.some(m => m.type === 'CANDIDATE' && m.src === 'peer2');
  
  if (peer1GotOffer && peer3GotAnswer && peer1GotCandidate) {
    console.log('\n✅ MULTI-PEER TEST PASSED');
  } else {
    console.log('\n❌ MULTI-PEER TEST FAILED');
    console.log('Peer1 got offer:', peer1GotOffer);
    console.log('Peer3 got answer:', peer3GotAnswer);
    console.log('Peer1 got candidate:', peer1GotCandidate);
  }
}

testMultiPeerRelay().catch(console.error);
