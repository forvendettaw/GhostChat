# GhostChat Usage Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open http://localhost:3000

### 3. Test P2P Chat (Local)

**Tab 1:**
1. Go to http://localhost:3000/chat
2. Enter room ID: `test123`
3. Click "Join Room"

**Tab 2:**
1. Open new tab: http://localhost:3000/chat
2. Enter same room ID: `test123`
3. Click "Join Room"
4. Send messages - they sync via WebRTC P2P

## How It Works

### Room-Based Chat
- Each room has a unique ID (e.g., `test123`, `private-room`)
- Anyone with the room ID can join
- Messages sent directly peer-to-peer via WebRTC
- Gun.js relay used only for initial peer discovery

### Privacy Features
- **RAM-Only Storage**: Messages stored in memory, vanish when tab closes
- **Ephemeral Identity**: New random peer ID each session
- **Auto-Blur**: Screen blurs when tab loses focus
- **No Tracking**: Zero analytics, no logs, no persistent data

### Connection Flow
1. User enters room ID
2. Gun.js relay announces presence
3. WebRTC offer/answer exchange via Gun.js
4. Direct P2P connection established
5. Messages flow peer-to-peer (Gun.js no longer involved)

## Testing Scenarios

### Local Multi-Tab Test
```bash
# Terminal 1
npm run dev

# Browser
Tab 1: localhost:3000/chat -> Room: "test"
Tab 2: localhost:3000/chat -> Room: "test"
```

### Multi-Device Test
```bash
# Get local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Desktop: http://localhost:3000/chat
# Mobile: http://YOUR_IP:3000/chat
# Both join same room ID
```

### Real P2P Test (Different Networks)
```bash
# Deploy to Cloudflare Pages or similar
npm run build

# User 1: https://your-app.pages.dev/chat -> Room: "secret"
# User 2: https://your-app.pages.dev/chat -> Room: "secret"
```

## Building for Production

### Static Export
```bash
npm run build
# Generates /out directory
```

### Deploy to Cloudflare Pages
```bash
npm install -g wrangler
wrangler pages deploy out
```

### Deploy to GitHub Pages
```bash
npm install -g gh-pages
npm run build
gh-pages -d out
```

## Troubleshooting

### Messages Not Syncing
- Check both tabs joined same room ID
- Check browser console for WebRTC errors
- Verify Gun.js relay is accessible
- Try different room ID

### Connection Failed
- Check firewall/NAT settings
- STUN servers may be blocked
- Try different network
- Check browser console for errors

### Icons Not Loading
- Run `npm run dev` to regenerate
- Check public/icon-192.png exists
- Clear browser cache

### Hydration Warnings
- Caused by browser extensions (Breakcold, etc.)
- Does not affect functionality
- Disable extensions to remove warnings

## Development Tips

### Add New Features
```bash
# Core logic
lib/webrtc.ts      # WebRTC peer management
lib/signaling.ts   # Gun.js signaling
lib/storage.ts     # Memory-only storage
lib/identity.ts    # Ephemeral identity

# UI components
components/ChatCore.tsx  # Main chat interface
app/chat/page.tsx        # Chat page
app/page.tsx             # Landing page
```

### Debug WebRTC
```javascript
// In browser console
localStorage.debug = 'simple-peer'
// Reload page to see WebRTC logs
```

### Test Gun.js Signaling
```javascript
// In browser console
gun.get('room-test123').get('peers').on(console.log)
```

## Security Notes

- Messages encrypted by WebRTC (DTLS/SRTP)
- Gun.js relay sees connection metadata only
- Peers see each other's IP addresses (P2P tradeoff)
- No message persistence (memory-only)
- No user accounts or authentication

## Limitations

- Must keep tab open for active connections
- ~15-20% users behind strict NAT need TURN servers
- Browser limits ~256 simultaneous WebRTC connections
- Cold start requires Gun.js relay availability
- Mobile battery drain from active P2P connections

## Next Steps

1. Add invite link generation
2. Implement QR code sharing
3. Add public discovery room
4. Implement share-to-unlock features
5. Add PWA install prompt
6. Deploy to production
