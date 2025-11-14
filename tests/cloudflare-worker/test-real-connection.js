const Peer = require('peerjs').default;

const CLOUDFLARE_CONFIG = {
  host: 'ghostchat-signaling.teycir.workers.dev',
  port: 443,
  path: '/peerjs',
  secure: true,
  debug: 3
};

async function testRealConnection() {
  console.log('=== Real-World Connection Test ===\n');
  console.log('Goal: 2 peers connect via Cloudflare Worker and exchange messages\n');
  
  return new Promise((resolve) => {
    let peer1, peer2;
    let peer1Connected = false;
    let peer2Connected = false;
    let messageReceived = false;
    
    console.log('Step 1: Creating Peer1...');
    peer1 = new Peer(CLOUDFLARE_CONFIG);
    
    peer1.on('open', (id) => {
      console.log(`✅ Peer1 connected with ID: ${id}\n`);
      peer1Connected = true;
      
      console.log('Step 2: Creating Peer2...');
      peer2 = new Peer(CLOUDFLARE_CONFIG);
      
      peer2.on('open', (id2) => {
        console.log(`✅ Peer2 connected with ID: ${id2}\n`);
        peer2Connected = true;
        
        console.log(`Step 3: Peer2 connecting to Peer1 (${id})...`);
        const conn = peer2.connect(id);
        
        conn.on('open', () => {
          console.log('✅ P2P connection established\n');
          
          console.log('Step 4: Peer2 sending message to Peer1...');
          conn.send('Hello from Peer2!');
        });
        
        conn.on('error', (err) => {
          console.log('❌ Connection error:', err);
          cleanup();
          resolve(false);
        });
      });
      
      peer2.on('error', (err) => {
        console.log('❌ Peer2 error:', err.type, err.message);
        cleanup();
        resolve(false);
      });
      
      peer1.on('connection', (conn) => {
        console.log('✅ Peer1 received incoming connection\n');
        
        conn.on('data', (data) => {
          console.log(`✅ Peer1 received message: "${data}"\n`);
          messageReceived = true;
          
          console.log('=== TEST PASSED ===');
          console.log('✅ Peers connected via Cloudflare Worker');
          console.log('✅ Message exchanged successfully');
          
          cleanup();
          resolve(true);
        });
        
        conn.on('error', (err) => {
          console.log('❌ Data connection error:', err);
          cleanup();
          resolve(false);
        });
      });
    });
    
    peer1.on('error', (err) => {
      console.log('❌ Peer1 error:', err.type, err.message);
      cleanup();
      resolve(false);
    });
    
    function cleanup() {
      setTimeout(() => {
        if (peer1) peer1.destroy();
        if (peer2) peer2.destroy();
      }, 1000);
    }
    
    setTimeout(() => {
      console.log('\n❌ TEST TIMEOUT (30s)');
      console.log('Status:');
      console.log(`  Peer1 connected: ${peer1Connected}`);
      console.log(`  Peer2 connected: ${peer2Connected}`);
      console.log(`  Message received: ${messageReceived}`);
      cleanup();
      resolve(false);
    }, 30000);
  });
}

testRealConnection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
