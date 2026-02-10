"use client";

import { useEffect, useRef, useState } from "react";
import { copyWithAutoClean } from "@/lib/clipboard-manager";

interface Message {
  id: string;
  text: string;
  peerId: string;
  isSelf: boolean;
  read?: boolean;
  expiresAt?: number;
  sensitive?: boolean;
  masked?: boolean;
  file?: {
    name: string;
    size: number;
    type: string;
    data: string;
  };
}

interface MessageListProps {
  messages: Message[];
  onDelete: (id: string) => void;
}

export default function MessageList({
  messages,
  onDelete,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now());
  const [revealedSensitive, setRevealedSensitive] = useState<Set<string>>(
    new Set(),
  );
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

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div style={{ textAlign: "center", opacity: 0.5, marginTop: isSmallMobile ? 20 : 40, fontSize: isSmallMobile ? 12 : undefined }}>
        暂无消息，开始聊天吧！
      </div>
    );
  }

  return (
    <>
      {messages.map((msg, i) => (
        <div
          key={msg.id}
          style={{
            marginBottom: isSmallMobile ? 8 : 12,
            textAlign: msg.isSelf ? "right" : "left",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "inline-block",
              position: "relative",
              maxWidth: isMobile ? "75%" : "50%",
              width: "fit-content",
              wordBreak: "break-word",
              boxSizing: "border-box",
            }}
          >
            <div
              onClick={() => {
                if (msg.masked) return;
                if (msg.sensitive && !revealedSensitive.has(msg.id)) {
                  setRevealedSensitive(new Set(revealedSensitive).add(msg.id));
                  setTimeout(() => {
                    setRevealedSensitive((prev) => {
                      const next = new Set(prev);
                      next.delete(msg.id);
                      return next;
                    });
                  }, 3000);
                } else if (msg.text) {
                  copyWithAutoClean(msg.text);
                }
              }}
              className={msg.text && !msg.masked ? "tooltip-btn" : ""}
              data-title={
                msg.masked
                  ? "消息已加密"
                  : msg.sensitive && !revealedSensitive.has(msg.id)
                    ? "点击显示"
                    : msg.text
                      ? "点击复制"
                      : undefined
              }
              style={{
                padding: isSmallMobile ? "10px 12px" : "10px 12px",
                background: msg.isSelf ? "#95ec69" : "#ffffff",
                color: "#000",
                borderRadius: 6,
                cursor: msg.text && !msg.masked ? "pointer" : "default",
                filter:
                  msg.sensitive && !revealedSensitive.has(msg.id)
                    ? "blur(8px)"
                    : "none",
                opacity: msg.masked ? 0.4 : 1,
                fontStyle: msg.masked ? "italic" : "normal",
                transition: "filter 0.2s",
                textAlign: "left",
                border: "1px solid #e5e5e5",
              }}
            >
              {msg.file ? (
                <div style={{ display: "flex", alignItems: "center", gap: isSmallMobile ? 6 : 8 }}>
                  {msg.file.type.startsWith("image/") ? (
                    <img
                      src={msg.file.data}
                      alt={msg.file.name}
                      style={{
                        maxWidth: isMobile ? "150px" : "200px",
                        maxHeight: isMobile ? "150px" : "200px",
                        borderRadius: 4,
                        display: "block",
                      }}
                    />
                  ) : (
                    <>
                      <span style={{ fontSize: isSmallMobile ? 20 : 24 }}>📄</span>
                      <a
                        href={msg.file.data}
                        download={msg.file.name}
                        style={{
                          color: "#000",
                          textDecoration: "none",
                          fontSize: isSmallMobile ? 10 : 11,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{msg.file.name}</div>
                        <div style={{ opacity: 0.7, fontSize: isSmallMobile ? 8 : 9 }}>
                          {(msg.file.size / 1024).toFixed(1)}KB
                        </div>
                      </a>
                    </>
                  )}
                </div>
              ) : msg.text ? (
                <span style={{ fontSize: isSmallMobile ? 15 : 16, lineHeight: 1.5, wordBreak: "break-word" }}>
                  {msg.text}
                </span>
              ) : null}
            </div>
            <div
              style={{
                display: "flex",
                gap: isSmallMobile ? 6 : 4,
                marginTop: isSmallMobile ? 6 : 4,
                fontSize: isSmallMobile ? 10 : 9,
                opacity: 0.6,
                justifyContent: msg.isSelf ? "flex-end" : "flex-start",
                alignItems: "center",
              }}
            >
              {msg.expiresAt &&
                (() => {
                  const remaining = Math.max(
                    0,
                    Math.ceil((msg.expiresAt - now) / 1000),
                  );
                  return (
                    <span style={{ color: remaining <= 5 ? "#f00" : "#999" }}>
                      ⏱️ {remaining}s
                    </span>
                  );
                })()}
              {msg.isSelf && msg.read && (
                <span className="tooltip-btn" data-title="已读">
                  ✓✓
                </span>
              )}
              {msg.isSelf && !msg.read && (
                <span className="tooltip-btn" data-title="已发送">
                  ✓
                </span>
              )}
              <button
                onClick={() => onDelete(msg.id)}
                className="tooltip-btn"
                data-title="删除"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: isSmallMobile ? "6px" : "4px",
                  fontSize: isSmallMobile ? 14 : 12,
                  opacity: 0.5,
                  minWidth: 40,
                  minHeight: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </>
  );
}
