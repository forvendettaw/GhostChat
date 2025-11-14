# GhostChat Signaling Server (Cloudflare Workers)

Free PeerJS signaling server using Cloudflare Workers + Durable Objects.

## Deploy

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
```

Your server will be live at: `https://ghostchat-signaling.YOUR-SUBDOMAIN.workers.dev`

## Test

Open `test-worker-peerjs.html` in browser:
1. Update host to your worker URL
2. Check HTTPS/WSS checkbox
3. Click "Test Connection"
4. All 3 tests should pass

## Configure GhostChat

Update `lib/peer-manager.ts`:

```typescript
function getPeerConfig() {
  return {
    host: 'ghostchat-signaling.YOUR-SUBDOMAIN.workers.dev',
    port: 443,
    path: '/peerjs',
    secure: true
  };
}
```

## Architecture

- HTTP endpoint: Returns peer IDs
- WebSocket: Handles signaling (OFFER/ANSWER/CANDIDATE)
- Durable Objects: Manages peer sessions
- CORS: Enabled for all origins

## Free Tier

- 100,000 requests/day
- Durable Objects: 1M reads/day, 1M writes/day
- Global edge network
- No cold starts
