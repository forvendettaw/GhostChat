# Changelog

## [0.3.0] - 2025-11-14

### Added
- **Custom Cloudflare Workers Signaling**: Replaced dependency on 0.peerjs.com with self-hosted Cloudflare Workers
- **Multi-Worker Pool**: Cascading fallback system with 2 Cloudflare Workers (200k requests/day capacity)
- **simple-peer Protocol**: New primary P2P protocol using simple-peer + Cloudflare Workers
- **Automatic Fallback**: Tries Worker 1 → Worker 2 → PeerJS (0.peerjs.com) automatically
- **Live Diagnostics Footer**: Real-time connection status, protocol, message count, and error display
- **Professional Copy Feedback**: Button changes to green "Copied!" instead of alert popup

### Changed
- **Protocol Architecture**: Isolated protocol implementations (peer-simplepeer.ts, peer-peerjs.ts)
- **Protocol Manager**: High-level manager handles primary/fallback logic transparently
- **UI Improvements**: Removed Settings button (obsolete), removed Diagnostics modal
- **Footer Diagnostics**: Always-visible status bar with live connection info

### Removed
- Settings modal (custom PeerJS server config - no longer needed)
- Diagnostics modal (replaced with live footer)
- Alert popups (replaced with inline feedback)

### Infrastructure
- Deployed 2 Cloudflare Workers on separate free accounts
- Worker 1: ghostchat-signaling.teycir.workers.dev
- Worker 2: ghostchat-signaling.teycitek.workers.dev
- Fallback: 0.peerjs.com (PeerJS public server)

### Technical
- Added `lib/peer-simplepeer.ts` - simple-peer implementation
- Added `lib/peer-peerjs.ts` - PeerJS implementation (backup)
- Added `lib/peer-protocol-manager.ts` - Protocol selection and fallback
- Added `lib/cloudflare-workers-pool.ts` - Worker pool management
- Updated `lib/peer-manager.ts` - Now uses protocol manager
- Comprehensive test suite for worker validation

### Capacity
- **200,000 requests/day** (2 workers × 100k each)
- **~10,000 chat sessions/day**
- **100% free infrastructure**
- **True decentralization**

---

## [0.2.0] - Previous Release

### Features
- PeerJS-based P2P chat
- Memory-only storage
- Ephemeral sessions
- QR code invite sharing
- PWA support
