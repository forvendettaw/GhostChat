'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const FEATURES = [
  'True P2P - Direct messages via WebRTC',
  'Zero server storage - No databases or logs',
  'Memory-only - Wiped on tab close',
  'No accounts - No phone or email needed',
  'Self-destructing - Auto-delete messages',
  'Open source - Fully auditable code',
  'E2E encryption - WebRTC DTLS/SRTP',
  'Ephemeral identity - Random peer ID',
  'Connection fingerprint - Verify no MITM',
  'P2P file transfer - Up to 10MB directly',
  'Chunked transfer - Reliable 64KB chunks',
  'Image preview - Inline display',
  'Metadata stripping - EXIF removal',
  'Panic button - Clear all (Ctrl+Shift+X)',
  'Message limit - Auto-cleanup options',
  'Session timeout - Auto-disconnect',
  'Screen blur - Auto-blur on tab switch',
  'No tracking - Zero analytics or telemetry',
  'PWA support - Install as app',
  'Markdown support - 16 formats',
  'Quick emojis - 15 one-click buttons',
  'Message search - Real-time filtering',
  'Copy protection - Auto-clear clipboard',
  'Read receipts - Delivery status',
  'Typing indicators - See when typing',
  'Message deletion - Delete for both sides',
  'Upload progress - Real-time bar',
  'Sensitive blur - Auto-detect passwords',
  'Anti-forensics - Memory overwrite',
  'Auto-clear - Data wiped on close',
  '$0 costs - Cloudflare Workers',
  'Automatic fallback - Multi-server',
];

export function CyclingFeatures() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % FEATURES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: 60, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '0 10px' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          style={{
            fontSize: 'clamp(12px, 3vw, 16px)',
            opacity: 0.85,
            fontWeight: 500,
            cursor: 'default',
            textAlign: 'center',
            position: 'absolute',
            width: '100%',
            maxWidth: '95%',
            lineHeight: 1.4,
          }}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {FEATURES[index].split('').map((char, i) => (
            <motion.span
              key={i}
              style={{ display: 'inline' }}
              variants={{
                hidden: { opacity: 0 },
                visible: { 
                  opacity: 1,
                  transition: {
                    duration: 0.1,
                    delay: (FEATURES[index].length - 1 - i) * 0.015
                  }
                },
                exit: { 
                  opacity: 0,
                  transition: {
                    duration: 0.05,
                    delay: i * 0.008
                  }
                }
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
