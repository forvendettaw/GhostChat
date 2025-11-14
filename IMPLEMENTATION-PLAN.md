# Cloudflare Worker Primary Server Implementation Plan

## Current State
- PRIMARY_SERVER: 0.peerjs.com (working)
- FALLBACK_SERVER: 0.peerjs.com (duplicate, no fallback logic)
- testServer() exists but never called
- usingFallback flag exists but never set
- ChatCore has fallback UI ready

## Goal
- PRIMARY_SERVER: ghostchat-signaling.teycir.workers.dev (Cloudflare)
- FALLBACK_SERVER: 0.peerjs.com (backup)
- Implement automatic fallback with server testing
- Show warning banner when fallback occurs

## Changes Required

### 1. Update Server Configurations (peer-manager.ts)
```typescript
const PRIMARY_SERVER = {
  host: 'ghostchat-signaling.teycir.workers.dev',
  port: 443,
  path: '/peerjs',
  secure: true
};

const FALLBACK_SERVER = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  secure: true
};
```

### 2. Implement Fallback Logic (peer-manager.ts)
- Test PRIMARY_SERVER first
- If fails, set usingFallback = true
- Use FALLBACK_SERVER
- Call onFallback() callback

### 3. Update getPeerConfig() (peer-manager.ts)
- Priority: custom config > PRIMARY_SERVER > FALLBACK_SERVER
- Test servers before returning config
- Set usingFallback flag appropriately

## Testing Strategy

### Phase 1: Verify Current State
1. Run app with current config (0.peerjs.com)
2. Confirm everything works
3. Take note of console logs

### Phase 2: Update to Cloudflare Primary
1. Change PRIMARY_SERVER to Cloudflare
2. Change FALLBACK_SERVER to 0.peerjs.com
3. Implement fallback logic
4. Test with Cloudflare working

### Phase 3: Test Fallback
1. Temporarily break Cloudflare URL
2. Verify fallback to 0.peerjs.com
3. Verify warning banner shows
4. Restore Cloudflare URL

### Phase 4: Integration Test
1. Test 2-peer connection (both tabs)
2. Test invite link flow
3. Test message sending
4. Verify no regressions

## Risk Mitigation

1. **Minimal changes**: Only modify peer-manager.ts
2. **Preserve existing logic**: Keep all connection handling unchanged
3. **Fallback safety**: If anything fails, falls back to working 0.peerjs.com
4. **Easy rollback**: Can revert PRIMARY_SERVER in 1 line if needed
5. **No UI changes**: ChatCore already has fallback UI ready

## Rollback Plan

If issues occur:
```typescript
// Instant rollback - change 1 line
const PRIMARY_SERVER = {
  host: '0.peerjs.com',  // <-- revert to this
  port: 443,
  path: '/',
  secure: true
};
```

## Success Criteria

- ✅ App connects using Cloudflare Worker by default
- ✅ Fallback to 0.peerjs.com if Cloudflare fails
- ✅ Warning banner shows when using fallback
- ✅ All existing functionality works (messages, connections, invite links)
- ✅ No console errors
- ✅ Custom server config still works
