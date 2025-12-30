'use client';

import { motion } from 'framer-motion';

export function AnimatedTagline({ text }: { text: string }) {
  const chars = text.split('');

  return (
    <motion.p
      style={{
        fontSize: 'clamp(16px, 4vw, 22px)',
        opacity: 0.9,
        marginBottom: 24,
        fontWeight: 500,
        cursor: 'default',
      }}
      className="vanish-text"
      initial="hidden"
      animate="visible"
    >
      {chars.map((char, i) => (
        <motion.span
          key={i}
          style={{ display: 'inline-block' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.1,
            delay: (chars.length - 1 - i) * 0.05
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.p>
  );
}
