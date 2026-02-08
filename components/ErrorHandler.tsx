"use client";

interface ErrorHandlerProps {
  error: string | null;
}

export default function ErrorHandler({ error }: ErrorHandlerProps) {
  if (!error) return null;

  const isPeerLeft = error.includes("Peer left") || error.includes("Peer Disconnected");

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        right: 20,
        background: "#1a1a1a",
        border: "1px solid #f00",
        borderRadius: 8,
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#f00",
          marginBottom: 8,
        }}
      >
        {isPeerLeft ? "对方已断开连接" : "连接失败"}
      </div>
      <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 12 }}>
        {error}
      </div>
      {isPeerLeft && (
        <div style={{ fontSize: 10, opacity: 0.6 }}>
          2秒后返回首页...
        </div>
      )}

    </div>
  );
}
