'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const FEATURES = [
  'True P2P - Messages travel directly between users via WebRTC',
  'Zero server storage - No databases, no logs, no message history',
  'Memory-only - Everything stored in RAM, wiped on tab close',
  'No accounts - No phone numbers, emails, or persistent identity',
  'Self-destructing - Messages auto-delete after 5s, 30s, 1m, or 5m',
  'Open source - Fully auditable code (MIT license)',
  'E2E encryption - WebRTC native DTLS/SRTP encryption',
  'Ephemeral identity - Random peer ID per session',
  'Connection fingerprint - 4-emoji hash to verify no MITM',
  'P2P file transfer - Send files up to 10MB directly',
  'Chunked transfer - Reliable transmission via 64KB chunks',
  'Image preview - Inline display for images',
  'Metadata stripping - EXIF removal from images',
  'Panic button - Clear all messages instantly (Ctrl+Shift+X)',
  'Message limit - Auto-cleanup (10, 25, 50, or 100 messages)',
  'Session timeout - Auto-disconnect after inactivity (5m-1h)',
  'Screen blur - Auto-blur on tab switch or idle',
  'No tracking - Zero analytics, telemetry, or user data collection',
  'PWA support - Installable as desktop/mobile app',
  'Markdown support - Bold, italic, code, and 13 more formats',
  'Quick emojis - 15 one-click emoji buttons',
  'Message search - Real-time filtering with highlighting',
  'Copy protection - Clipboard auto-clears after 10 seconds',
  'Read receipts - Single/double checkmark delivery status',
  'Typing indicators - See when peer is typing',
  'Message deletion - Delete for both sides with P2P sync',
  'Upload progress - Real-time progress bar for files',
  'Sensitive content blur - Auto-detect passwords, SSN, credit cards',
  'Anti-forensics - Memory overwrite on message delete',
  'Auto-clear on close - All data wiped when tab closes',
  '$0 operating costs - Cloudflare Workers signaling',
  'Automatic fallback - Worker 1 -> Worker 2 -> PeerJS backup',
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
