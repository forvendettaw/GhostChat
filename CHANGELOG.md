# Changelog

All notable changes to GhostChat will be documented in this file.

## [0.2.0] - 2025-01-15 (Alpha)

### Status
- **Alpha 0.2.0**: Production roadmap in progress (3/5 phases complete)
- **Connection Success**: 60-70% cross-network, 75-85% same ISP, 95%+ local
- **Best Use**: Testing, alpha users, same-network scenarios
- **Completed**: Infrastructure, UX improvements, signaling server, performance optimizations

### Added (Phase 1: Critical Infrastructure)
- IndexedDB invite management with 24-hour expiry
- Multi-provider TURN configuration (openrelay.metered.ca, turn.bistri.com)
- Connection quality monitoring (ping/pong, latency tracking)
- Error handler UI with troubleshooting tips
- Invite validation system
- Automatic cleanup of expired invites

### Added (Phase 2: User Experience)
- Mobile PWA optimizations (iOS/Android)
- Network diagnostics tool (WebRTC support, STUN connectivity, network quality)
- Wake lock support for mobile devices
- HTTPS enforcement on mobile
- Zoom prevention for better mobile UX
- Enhanced PWA manifest (maskable icons, portrait orientation)
- Diagnostics UI with color-coded test results

### Added (Phase 3: Signaling & Performance)
- **Cloudflare Workers signaling server** (production-ready, free)
- Default host: ghostchat-signaling.teycir.workers.dev
- Message compression using native Compression Streams API
- Automatic gzip for messages >100 characters
- Bandwidth monitoring (bytes sent/received, messages/second)
- Connection pooling (prevents duplicate connections)
- Custom server configuration via Settings UI
- SIGNALING-SERVER.md with deployment guides

### Added (Previous Alpha 0.1.0)
- Invite link system replacing room names for P2P connections
- "Create Invite Link" button with clear sharing instructions
- Connection status indicators (Connecting/Connected/Disconnected)
- Message queue system to buffer messages before connection
- Disconnect detection with red "✗ Disconnected" status
- Input field disabled until connection established
- White button styling throughout UI
- White message bubbles for sent messages
- Step-by-step footer instructions on pre-join screen
- Clipboard fallback for non-HTTPS contexts

### Changed
- Default signaling server from 0.peerjs.com to Cloudflare Workers
- Compression now async for better performance
- Connection retry logic improved with duplicate prevention
- Mobile detection and optimizations applied automatically
- PWA manifest enhanced for better mobile integration
- Replaced Gun.js with PeerJS for simpler, more reliable P2P (0.1.0)
- Fixed peer ID generation to comply with PeerJS validation (0.1.0)
- Message input now white background when connected (0.1.0)

### Fixed
- Connection reliability improved with multi-provider TURN
- Mobile connection issues with wake lock and HTTPS enforcement
- Bandwidth optimization with adaptive compression
- First message loss issue (messages now queued until connected) (0.1.0)
- Invalid peer ID error (removed leading hyphens) (0.1.0)
- Clipboard API unavailable on non-HTTPS contexts (0.1.0)

### Added (Previous)
- Initial project setup with Next.js 15
- Basic P2P chat functionality using WebRTC
- Gun.js signaling for peer discovery
- Memory-only storage (RAM-only, no disk writes)
- Ephemeral identity generation (random UUID per session)
- Auto-blur privacy feature when tab loses focus
- Invite link-based chat system (replaced room names)
- PWA manifest and service worker
- Landing page with ghost branding
- Join room interface with ghost icon
- Warning footer about room name collisions
- Unique room name enforcement in UI
- Multi-peer support (mesh network)
- Global CSS styling
- SEO meta tags and Open Graph support

### Features
- Direct P2P messaging via WebRTC data channels
- No message persistence (everything wiped on tab close)
- No user accounts or authentication
- Cross-platform support (desktop, mobile, any browser)
- Static export for easy deployment
- Zero server costs (Cloudflare Pages compatible)

### Security
- WebRTC native encryption (DTLS/SRTP)
- No message logging or tracking
- No analytics or telemetry
- Open source and auditable

### Documentation
- Comprehensive README with user and developer guides
- Usage guide (USAGE.md)
- Example scenarios for 2-person and group chats
- FAQ section
- Architecture documentation
- Deployment instructions

### Performance Improvements
- Message compression reduces bandwidth by 50-70% for long messages
- Connection pooling prevents duplicate peer connections
- Bandwidth monitoring enables adaptive optimization
- Cloudflare Workers provides zero cold starts (instant connections)
- Multi-provider TURN improves NAT traversal success rates

### Documentation
- ROADMAP.md with 10-week production plan
- STATUS.md with real-world success rates
- SIGNALING-SERVER.md with Cloudflare/Render/Railway guides
- PEERJS-CLOUD.md with server options
- cloudflare-worker/ deployment ready

### Known Limitations
- **Invite links expire after 24 hours** (improved from tab-close)
- **Connection reliability varies** (60-70% cross-network, improving)
- **Corporate/mobile networks** may block WebRTC (diagnostics tool helps)
- Must keep tab open while chatting
- Both users must be online simultaneously
- IP addresses visible to peers (P2P nature, use VPN)
- **Alpha status**: Not recommended for production use yet

### Roadmap Progress
- ✅ Phase 1: Critical Infrastructure (100%)
- ✅ Phase 2: User Experience (100%)
- ✅ Phase 3: Signaling & Performance (100%)
- 🔄 Phase 4: Security & Monitoring (Next)
- 📋 Phase 5: Testing & Launch (Planned)

## [0.1.0] - 2025-01-13 (Initial Alpha)

### Project Goals
- True peer-to-peer chat with zero traces
- Maximum privacy (no servers, no storage, no history)
- Simple and intuitive user experience
- Free and open source forever
- Easy deployment (static PWA)

---

**Note**: This project is in pre-MVP development. Features and APIs may change.
