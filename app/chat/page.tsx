'use client'

import { useState, useEffect, Suspense } from 'react'
import ChatCore from '@/components/ChatCore'
import { useSearchParams } from 'next/navigation'

function ChatContent() {
  const searchParams = useSearchParams()
  const invitePeerId = searchParams.get('peer')
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (invitePeerId) {
      setJoined(true)
    }
  }, [invitePeerId])

  if (!joined) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        color: '#fff'
      }}>
        <img
          src="/assets/ghostNobg.png"
          alt="Ghost"
          style={{ width: 'clamp(120px, 25vw, 180px)', height: 'auto', marginBottom: 30, opacity: 0.9, animation: 'float 3s ease-in-out infinite' }}
        />
        <h1 style={{
          fontSize: 'clamp(36px, 10vw, 64px)',
          marginBottom: 16,
          fontWeight: 700,
          letterSpacing: -1
        }}>
          GhostChat
        </h1>
        <p style={{
          fontSize: 'clamp(16px, 4vw, 22px)',
          marginBottom: 50,
          maxWidth: '90%',
          textAlign: 'center',
          lineHeight: 1.5,
          animation: 'vanishOnce 24s ease-out forwards'
        }}>
          Your messages vanish like ghosts.
        </p>
        <button
          onClick={() => setJoined(true)}
          className="start-btn"
        >
          Start Chatting
        </button>
      </div>
    )
  }

  return <ChatCore invitePeerId={invitePeerId} />
}

export default function Chat() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>}>
      <ChatContent />
    </Suspense>
  )
}
