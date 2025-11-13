"use client";

interface ErrorHandlerProps {
  error: string | null;
  onRetry: () => void;
  onDismiss: () => void;
}

export default function ErrorHandler({ error, onRetry, onDismiss }: ErrorHandlerProps) {
  if (!error) return null;

  const getTroubleshooting = () => {
    return [
      'Check your internet connection',
      'Disable VPN or firewall temporarily',
      'Try a different network',
      'Ask your friend to create the invite link instead'
    ];
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 20,
      right: 20,
      background: '#1a1a1a',
      border: '1px solid #f00',
      borderRadius: 8,
      padding: 16,
      zIndex: 1000
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#f00', marginBottom: 8 }}>
        Connection Failed
      </div>
      <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 12 }}>
        {error}
      </div>
      <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 12 }}>
        <strong>Try:</strong>
        <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
          {getTroubleshooting().map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onRetry}
          style={{
            flex: 1,
            padding: 8,
            background: '#fff',
            border: 'none',
            borderRadius: 6,
            color: '#000',
            fontSize: 11,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Retry Connection
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: 8,
            background: '#333',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            fontSize: 11,
            cursor: 'pointer'
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
