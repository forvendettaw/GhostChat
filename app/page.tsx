"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ textAlign: "center", maxWidth: "90%" }}>
        <img src="/assets/ghostNobg.png" alt="Ghost" style={{ width: "120px", height: "120px", marginBottom: 20 }} className="ghost-icon" />
        <h1 style={{ fontSize: "clamp(32px, 8vw, 48px)", marginBottom: 12, fontWeight: 700 }}>GhostChat</h1>
        <p style={{ fontSize: "clamp(14px, 3vw, 18px)", opacity: 0.7, marginBottom: 32 }} className="vanish-text">Your messages vanish like ghosts</p>
        <button
          onClick={() => router.push("/chat")}
          className="start-btn"
        >
          Start Chatting
        </button>
      </div>
    </div>
  );
}
