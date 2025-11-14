const Peer = require('peerjs').default;

const CLOUDFLARE_CONFIG = {
  host: 'ghostchat-signaling.teycir.workers.dev',
  port: 443,
  path: '/peerjs',
  secure: true
};

const FALLBACK_CONFIG = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  secure: true
};

async function testPeerJSConnection(config, name) {
  return new Promise((resolve) => {
    console.log(`\nTesting ${name}...`);
    console.log('Config:', config);
    
    const peer = new Peer(config);
    
    const timeout = setTimeout(() => {
      console.log(`  ❌ ${name} - Timeout (10s)`);
      peer.destroy();
      resolve(false);
    }, 10000);
    
    peer.on('open', (id) => {
      clearTimeout(timeout);
      console.log(`  ✅ ${name} - Connected with ID: ${id}`);
      peer.destroy();
      resolve(true);
    });
    
    peer.on('error', (err) => {
      clearTimeout(timeout);
      console.log(`  ❌ ${name} - Error: ${err.type} - ${err.message}`);
      peer.destroy();
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('=== PeerJS Client Connection Test ===\n');
  
  const cloudflareWorks = await testPeerJSConnection(CLOUDFLARE_CONFIG, 'Cloudflare Worker');
  const fallbackWorks = await testPeerJSConnection(FALLBACK_CONFIG, '0.peerjs.com');
  
  console.log('\n=== Results ===');
  console.log(`Cloudflare Worker: ${cloudflareWorks ? '✅ Working' : '❌ Failed'}`);
  console.log(`0.peerjs.com: ${fallbackWorks ? '✅ Working' : '❌ Failed'}`);
  
  if (!cloudflareWorks && fallbackWorks) {
    console.log('\n⚠️  Cloudflare Worker not compatible with PeerJS client');
    console.log('   Worker needs to implement full PeerJS signaling protocol');
  }
}

runTests().catch(console.error);
