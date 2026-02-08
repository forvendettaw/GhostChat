"use client";

import { useRef, useState, useEffect } from "react";
import { getMaxFileSizeMB } from "@/lib/file-transfer";

interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  connected: boolean;
  onSend: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTyping: () => void;
}

export default function MessageInput({
  input,
  setInput,
  connected,
  onSend,
  onFileSelect,
  onTyping,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const [screenWidth, setScreenWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  // 响应式检测
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = screenWidth < 768;
  const isSmallMobile = screenWidth < 480;

  const maxChars = 500;

  return (
    <div
      style={{
        padding: isSmallMobile ? "8px 12px" : "10px 16px",
        display: "flex",
        gap: isSmallMobile ? 8 : 10,
        alignItems: "center",
        background: "#f7f7f7",
        borderTop: "1px solid #e5e5e5",
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        style={{ display: "none" }}
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={!connected}
        style={{
          padding: isSmallMobile ? "10px" : "12px",
          background: connected ? "#fff" : "#e5e5e5",
          border: "1px solid #e5e5e5",
          borderRadius: 6,
          color: connected ? "#000" : "#999",
          cursor: connected ? "pointer" : "not-allowed",
          fontSize: isSmallMobile ? 18 : 20,
          fontWeight: "bold",
          minHeight: 44,
          minWidth: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        data-title="上传文件（最大10MB）"
        className="tooltip-btn"
      >
        +
      </button>
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          if (connected && e.target.value) {
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => onTyping(), 300);
          }
        }}
        onKeyPress={(e) => {
          if (e.key === "Enter" && connected) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={connected ? "发消息..." : "等待连接..."}
        disabled={!connected}
        style={{
          flex: 1,
          padding: isSmallMobile ? "10px 12px" : "12px 14px",
          background: connected ? "#fff" : "#e5e5e5",
          border: "none",
          borderRadius: 6,
          color: connected ? "#000" : "#999",
          outline: "none",
          cursor: connected ? "text" : "not-allowed",
          fontSize: isSmallMobile ? 15 : 16,
          minHeight: 44,
        }}
        maxLength={maxChars}
      />
      <button
        onClick={onSend}
        disabled={!connected || !input.trim()}
        style={{
          background: connected && input.trim() ? "#95ec69" : "#e5e5e5",
          color: connected && input.trim() ? "#000" : "#999",
          padding: isSmallMobile ? "10px 18px" : "12px 22px",
          borderRadius: 6,
          border: "none",
          fontSize: isSmallMobile ? 14 : 15,
          fontWeight: 500,
          cursor: connected && input.trim() ? "pointer" : "not-allowed",
          minHeight: 44,
          minWidth: 60,
        }}
      >
        发送
      </button>
    </div>
  );
}
