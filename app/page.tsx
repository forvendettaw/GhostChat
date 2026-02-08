"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { decodeInviteLink } from "@/lib/link-encoder";

export default function Home() {
  const router = useRouter();
  const [encodedInput, setEncodedInput] = useState("");
  const [decodeError, setDecodeError] = useState("");

  const handleStart = () => {
    if (encodedInput.trim()) {
      // 有输入码，尝试解码并连接
      const decoded = decodeInviteLink(encodedInput);
      if (decoded) {
        window.location.href = decoded;
      } else {
        setDecodeError("代码格式无效");
        setTimeout(() => setDecodeError(""), 3000);
      }
    } else {
      // 无输入码，创建新聊天
      router.push("/chat");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        position: "relative",
        zIndex: 100,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "90%", position: "relative", zIndex: 101 }}>
        <div
          style={{
            width: "100%",
            maxWidth: 500,
            margin: "0 auto 24px",
            padding: 20,
            background: "rgba(255, 255, 255, 0.05)",
            border: "2px solid rgba(255, 221, 0, 0.3)",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 12,
              color: "#fff",
            }}
          >
            在此粘贴对方发送的代码以打开聊天
          </div>
          <input
            type="text"
            value={encodedInput}
            onChange={(e) => setEncodedInput(e.target.value)}
            placeholder="粘贴编码后的邀请码..."
            style={{
              width: "100%",
              padding: 14,
              background: "#0a0a0a",
              border: decodeError ? "2px solid #f00" : "2px solid #333",
              borderRadius: 8,
              color: "#fd0",
              fontSize: 13,
              fontFamily: "monospace",
              outline: "none",
              boxSizing: "border-box",
              textAlign: "center",
              minHeight: 48,
            }}
          />
          <button
            onClick={handleStart}
            style={{
              width: "100%",
              padding: 14,
              marginTop: 12,
              background: "linear-gradient(135deg, #0f0 0%, #0d0 100%)",
              border: "none",
              borderRadius: 8,
              color: "#000",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              minHeight: 48,
            }}
          >
            开始
          </button>
          {decodeError && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#f00" }}>
              {decodeError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
