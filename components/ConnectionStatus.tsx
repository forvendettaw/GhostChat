"use client";

interface ConnectionStatusProps {
  connected: boolean;
  connecting: boolean;
}

export default function ConnectionStatus({ connected, connecting }: ConnectionStatusProps) {
  return (
    <div
      style={{
        fontSize: 10,
        marginTop: 4,
        color: connected ? "#0f0" : connecting ? "#ff0" : "#f00",
      }}
    >
      {connected
        ? "✓ Connected"
        : connecting
          ? "Establishing connection..."
          : "✗ Disconnected"}
    </div>
  );
}
