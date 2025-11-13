'use client'

import { useState } from 'react'
import ChatCore from '@/components/ChatCore'

export default function Chat() {
  const [roomId, setRoomId] = useState('')
  const [joined, setJoined] = useState(false)

  if (!joined) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', padding: 40, textAlign: 'center' }}>
        <img 
          src="/assets/ghostNobg.png" 
          alt="Ghost" 
          width={80} 
          height={80} 
          style={{ margin: '0 auto 20px', display: 'block' }}
        />
        <h2 style={{ marginBottom: 20 }}>Join a Room</h2>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && roomId && setJoined(true)}
          placeholder="Enter unique room name (e.g., alice-bob-jan15)..."
          style={{
            width: '100%',
            padding: 12,
            background: '#111',
            border: '1px solid #333',
            borderRadius: 8,
            color: '#fff',
            outline: 'none',
            marginBottom: 16
          }}
        />
        <button
          onClick={() => roomId && setJoined(true)}
          style={{
            width: '100%',
            padding: 12,
            background: '#0066ff',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Join Room
        </button>
        <div style={{ 
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16, 
          background: '#1a1a1a', 
          fontSize: 11, 
          opacity: 0.8,
          borderTop: '1px solid #333',
          textAlign: 'center'
        }}>
          <strong>⚠️ Use unique room names!</strong><br/>
          If two groups use the same name (e.g., "meeting"), everyone will be connected together.<br/>
          <span style={{ opacity: 0.6 }}>Example: "alice-bob-jan15" instead of "meeting"</span>
        </div>
      </div>
    )
  }

  return <ChatCore roomId={roomId} />
}
