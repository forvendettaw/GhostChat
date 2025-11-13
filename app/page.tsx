import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 40, textAlign: 'center' }}>
      <img 
        src="/assets/ghost.jpeg" 
        alt="Ghost" 
        width={120} 
        height={120} 
        style={{ margin: '0 auto 20px', display: 'block' }}
      />
      <h1 style={{ fontSize: 48, marginBottom: 20 }}>GhostChat</h1>
      <p style={{ fontSize: 20, marginBottom: 40, opacity: 0.8 }}>
        Your messages vanish like ghosts. Direct P2P chat with zero traces.
      </p>
      
      <div style={{ marginBottom: 40 }}>
        <Link 
          href="/chat" 
          style={{ 
            display: 'inline-block',
            padding: '16px 32px', 
            background: '#fff', 
            color: '#000', 
            textDecoration: 'none',
            borderRadius: 8,
            fontWeight: 600
          }}
        >
          Start Chatting
        </Link>
      </div>

      <div style={{ textAlign: 'left', opacity: 0.7, fontSize: 14 }}>
        <h3>Features:</h3>
        <ul>
          <li>✓ Direct P2P - Messages never touch servers</li>
          <li>✓ RAM-only - Zero disk traces</li>
          <li>✓ Auto-wipe - Everything disappears on close</li>
          <li>✓ No tracking - No servers, no logs</li>
          <li>✓ Open source - Fully auditable</li>
        </ul>
      </div>
    </div>
  )
}
