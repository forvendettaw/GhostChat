# Cloudflare Worker Tests

Automated test suite for the GhostChat PeerJS signaling server running on Cloudflare Workers.

## Running Tests

```bash
# Run all tests
npm run test:worker

# Run individual tests
node tests/cloudflare-worker/test-worker-websocket.js
node tests/cloudflare-worker/test-worker-multi-peer.js
node tests/cloudflare-worker/test-worker-stress.js
node tests/cloudflare-worker/test-worker-disconnect.js
node tests/cloudflare-worker/test-worker-invalid.js
node tests/cloudflare-worker/test-worker-id-endpoint.js
```

## Test Files

- `test-worker-websocket.js` - Basic 2-peer message relay
- `test-worker-multi-peer.js` - 3-peer routing validation
- `test-worker-stress.js` - 100 rapid messages stress test
- `test-worker-disconnect.js` - Connection lifecycle handling
- `test-worker-invalid.js` - Error handling and edge cases
- `test-worker-id-endpoint.js` - UUID generation validation

## Test Results

See `TEST-RESULTS.md` for detailed results and metrics.

## Prerequisites

```bash
npm install ws
```

## Worker URL

Tests run against: `wss://ghostchat-signaling.teycir.workers.dev`
