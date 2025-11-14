const https = require('https');

const PRIMARY_URL = 'https://ghostchat-signaling.teycir.workers.dev/peerjs/id';
const FALLBACK_URL = 'https://0.peerjs.com/peerjs/id';

async function testEndpoint(url, name) {
  return new Promise((resolve) => {
    console.log(`Testing ${name}: ${url}`);
    
    const timeout = setTimeout(() => {
      console.log(`  ❌ ${name} - Timeout (3s)`);
      resolve(false);
    }, 3000);
    
    https.get(url, (res) => {
      clearTimeout(timeout);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const isValid = res.statusCode === 200 && data.length > 0;
        console.log(`  ${isValid ? '✅' : '❌'} ${name} - Status: ${res.statusCode}, Response: ${data.substring(0, 40)}...`);
        resolve(isValid);
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      console.log(`  ❌ ${name} - Error: ${err.message}`);
      resolve(false);
    });
  });
}

async function testServerSelection() {
  console.log('=== Server Configuration Test ===\n');
  
  const primaryWorks = await testEndpoint(PRIMARY_URL, 'PRIMARY (Cloudflare)');
  const fallbackWorks = await testEndpoint(FALLBACK_URL, 'FALLBACK (0.peerjs.com)');
  
  console.log('\n=== Results ===');
  console.log(`Primary server: ${primaryWorks ? '✅ Available' : '❌ Unavailable'}`);
  console.log(`Fallback server: ${fallbackWorks ? '✅ Available' : '❌ Unavailable'}`);
  
  console.log('\n=== Selection Logic ===');
  if (primaryWorks) {
    console.log('✅ Would use PRIMARY (Cloudflare Worker)');
  } else if (fallbackWorks) {
    console.log('⚠️  Would use FALLBACK (0.peerjs.com)');
  } else {
    console.log('❌ Both servers unavailable');
  }
  
  console.log('\n=== Test Complete ===');
  
  if (!fallbackWorks) {
    console.log('\n⚠️  WARNING: Fallback server unavailable - this is critical!');
  }
}

testServerSelection().catch(console.error);
