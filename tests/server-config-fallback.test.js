const https = require('https');

async function testEndpoint(url, name) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 3000);
    
    https.get(url, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(res.statusCode === 200 && data.length > 0);
      });
    }).on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function testFallbackLogic() {
  console.log('=== Fallback Logic Test ===\n');
  
  const PRIMARY_URL = 'https://ghostchat-signaling.teycir.workers.dev/peerjs/id';
  const FALLBACK_URL = 'https://0.peerjs.com/peerjs/id';
  const INVALID_URL = 'https://nonexistent-server-12345.invalid/peerjs/id';
  
  console.log('Test 1: Primary available');
  const primary1 = await testEndpoint(PRIMARY_URL, 'primary');
  const fallback1 = await testEndpoint(FALLBACK_URL, 'fallback');
  console.log(`  Primary: ${primary1 ? '✅' : '❌'}, Fallback: ${fallback1 ? '✅' : '❌'}`);
  console.log(`  Selected: ${primary1 ? 'PRIMARY' : 'FALLBACK'}`);
  console.log(`  ${primary1 ? '✅ PASS' : '❌ FAIL'} - Should use PRIMARY\n`);
  
  console.log('Test 2: Primary unavailable (simulated)');
  const primary2 = await testEndpoint(INVALID_URL, 'primary');
  const fallback2 = await testEndpoint(FALLBACK_URL, 'fallback');
  console.log(`  Primary: ${primary2 ? '✅' : '❌'}, Fallback: ${fallback2 ? '✅' : '❌'}`);
  console.log(`  Selected: ${primary2 ? 'PRIMARY' : 'FALLBACK'}`);
  console.log(`  ${!primary2 && fallback2 ? '✅ PASS' : '❌ FAIL'} - Should use FALLBACK\n`);
  
  console.log('Test 3: Both unavailable (simulated)');
  const primary3 = await testEndpoint(INVALID_URL, 'primary');
  const fallback3 = await testEndpoint(INVALID_URL, 'fallback');
  console.log(`  Primary: ${primary3 ? '✅' : '❌'}, Fallback: ${fallback3 ? '✅' : '❌'}`);
  console.log(`  Selected: ${primary3 ? 'PRIMARY' : fallback3 ? 'FALLBACK' : 'NONE'}`);
  console.log(`  ${!primary3 && !fallback3 ? '✅ PASS' : '❌ FAIL'} - Should fail gracefully\n`);
  
  console.log('=== All Tests Complete ===');
}

testFallbackLogic().catch(console.error);
