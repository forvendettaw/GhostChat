const https = require('https');

const WORKER_URL = 'https://ghostchat-signaling.teycir.workers.dev';

async function testIdEndpoint() {
  console.log('Testing ID generation endpoints...\n');
  
  const endpoints = [
    '/peerjs/id',
    '/peerjs/peerjs/id'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`);
    
    const ids = [];
    for (let i = 0; i < 5; i++) {
      const id = await new Promise((resolve, reject) => {
        https.get(`${WORKER_URL}${endpoint}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });
      
      ids.push(id);
      console.log(`  ID ${i + 1}: ${id.substring(0, 20)}...`);
    }
    
    const allValid = ids.every(id => /^[0-9a-f-]{36}$/.test(id));
    const allUnique = new Set(ids).size === ids.length;
    
    console.log(`  Valid UUIDs: ${allValid ? '✅' : '❌'}`);
    console.log(`  All unique: ${allUnique ? '✅' : '❌'}`);
    console.log();
  }
  
  console.log('=== ID ENDPOINT TEST COMPLETE ===');
}

testIdEndpoint().catch(console.error);
