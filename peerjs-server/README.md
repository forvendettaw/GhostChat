# GhostChat PeerJS Signaling Server

Cloudflare Worker for WebRTC signaling.

## Setup

```bash
cd peerjs-server
npm install
```

## Deploy

```bash
npm run deploy
```

After deployment, update your GhostChat app:
1. Open Settings in chat
2. Enter your worker URL: `ghostchat-signaling.YOUR_SUBDOMAIN.workers.dev`
3. Port: 443
4. Path: /peerjs
5. Save and reload

## Cost

Free tier: 100,000 requests/day
