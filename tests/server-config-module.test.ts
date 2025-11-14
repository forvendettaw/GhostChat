import { getServerConfig, getPrimaryServer, getFallbackServer, isUsingFallback } from '../lib/server-config';

async function runTests() {
  console.log('=== Server Config Module Test ===\n');
  
  console.log('Test 1: Get primary server config');
  const primary = getPrimaryServer();
  console.log('  Primary:', primary);
  console.log(`  ${primary.host === 'ghostchat-signaling.teycir.workers.dev' ? '✅' : '❌'} Correct host`);
  console.log(`  ${primary.port === 443 ? '✅' : '❌'} Correct port`);
  console.log(`  ${primary.path === '/peerjs' ? '✅' : '❌'} Correct path\n`);
  
  console.log('Test 2: Get fallback server config');
  const fallback = getFallbackServer();
  console.log('  Fallback:', fallback);
  console.log(`  ${fallback.host === '0.peerjs.com' ? '✅' : '❌'} Correct host`);
  console.log(`  ${fallback.port === 443 ? '✅' : '❌'} Correct port`);
  console.log(`  ${fallback.path === '/' ? '✅' : '❌'} Correct path\n`);
  
  console.log('Test 3: Get server config (should use primary)');
  const result = await getServerConfig();
  console.log('  Result:', result);
  console.log(`  ${result.config.host === 'ghostchat-signaling.teycir.workers.dev' ? '✅' : '❌'} Using primary`);
  console.log(`  ${result.isUsingFallback === false ? '✅' : '❌'} Not using fallback`);
  console.log(`  ${isUsingFallback() === false ? '✅' : '❌'} Flag is false\n`);
  
  console.log('Test 4: Custom config override');
  const custom = {
    host: 'custom.example.com',
    port: 9000,
    path: '/custom',
    secure: true
  };
  const customResult = await getServerConfig(custom);
  console.log('  Result:', customResult);
  console.log(`  ${customResult.config.host === 'custom.example.com' ? '✅' : '❌'} Using custom`);
  console.log(`  ${customResult.isUsingFallback === false ? '✅' : '❌'} Not flagged as fallback\n`);
  
  console.log('=== All Module Tests Complete ===');
}

runTests().catch(console.error);
