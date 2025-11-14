# Pre-Deployment Test Checklist

## Build Status
- [x] Production build completed successfully
- [ ] No TypeScript errors
- [ ] No build warnings (except headers warning - expected for static export)

## Local Testing

### Setup
```bash
./test-production.sh
# Or manually: npx serve out -p 3000
```

### Test 1: Basic Connection (Same Device)
- [ ] Open Tab 1: http://localhost:3000/chat
- [ ] Click "Create Invite Link"
- [ ] Copy the invite link
- [ ] Open Tab 2: Paste invite link
- [ ] Both tabs show "Connected" status
- [ ] Send message from Tab 1 -> appears in Tab 2
- [ ] Send message from Tab 2 -> appears in Tab 1
- [ ] Close Tab 1 -> Tab 2 shows "Disconnected"

### Test 2: Mobile Testing (Same Network)
```bash
# Get your local IP
ip addr show | grep "inet " | grep -v 127.0.0.1
```
- [ ] Desktop: http://localhost:3000/chat -> Create invite
- [ ] Mobile: http://YOUR_IP:3000/chat -> Paste invite
- [ ] Connection established
- [ ] Messages sync both ways
- [ ] PWA install prompt appears on mobile

### Test 3: Privacy Features
- [ ] Switch to another tab -> chat blurs
- [ ] Switch back -> chat unblurs
- [ ] Close tab -> reopen -> no message history
- [ ] No messages in localStorage/IndexedDB (check DevTools)

### Test 4: UI/UX
- [ ] Landing page loads (http://localhost:3000)
- [ ] "Start Chatting" button works
- [ ] QR code generates correctly
- [ ] Settings panel opens/closes
- [ ] Diagnostics panel shows peer info
- [ ] Input disabled when disconnected
- [ ] Send button disabled when disconnected

### Test 5: Error Handling
- [ ] Invalid invite link shows error
- [ ] Connection timeout shows error
- [ ] Rate limiting works (send 10+ messages quickly)
- [ ] Message validation (empty, too long)

### Test 6: Cross-Network (Real P2P Test)
- [ ] Desktop on WiFi creates invite
- [ ] Mobile on cellular joins invite
- [ ] Connection succeeds (may need TURN server)
- [ ] Messages sync across networks

## Performance
- [ ] Page loads < 2 seconds
- [ ] Messages send instantly when connected
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] Works on slow 3G connection

## Browser Compatibility
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (desktop)
- [ ] Safari (iOS)
- [ ] Edge

## Ready for Deployment?
- [ ] All critical tests pass
- [ ] No console errors
- [ ] P2P connection works reliably
- [ ] Privacy features working

## Deploy Command
```bash
# After all tests pass:
npx wrangler pages deploy out
```
