"use client";

import React, { useEffect, useState } from "react";
import { getMessages, storeMessage } from "@/lib/storage";
import {
  initPeer,
  connectToPeer,
  sendToAll,
  destroy,
} from "@/lib/peer-manager";
import { inviteManager } from "@/lib/invite-manager";
import {
  isIOSPWA,
  isMobile,
  requestWakeLock,
  ensureHTTPS,
} from "@/lib/mobile-utils";
import { checkRateLimit } from "@/lib/rate-limiter";
import { validateMessage } from "@/lib/input-validation";
import { generateQRCode } from "@/lib/qr-code";
import { getConnectionErrorMessage } from "@/lib/error-messages";
import { saveSession, getSession, clearSession } from "@/lib/session-recovery";
import ErrorHandler from "./ErrorHandler";

interface ChatCoreProps {
  invitePeerId: string | null;
}

interface Message {
  text: string;
  peerId: string;
  isSelf: boolean;
}

export default function ChatCore({ invitePeerId }: ChatCoreProps) {
  const [peerId, setPeerId] = useState("");
  const [messages, setMessages] = useState(getMessages());
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [showInvite, setShowInvite] = useState(true);
  const [linkCreated, setLinkCreated] = useState(false);
  const [messageQueue, setMessageQueue] = useState<string[]>([]);


  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [fallbackWarning, setFallbackWarning] = useState(false);
  const [copied, setCopied] = useState(false);
  const initialized = React.useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    let mounted = true;
    
    (async () => {
    if (isMobile()) {
      ensureHTTPS();
      requestWakeLock();
    }
    const handleMessage = (fromPeerId: string, data: string) => {
      console.log("[CHAT] Received message:", data, "from:", fromPeerId);
      storeMessage({ text: data, peerId: fromPeerId, isSelf: false });
      setMessages((prev) => [...getMessages()]);
    };

    const handleConnect = () => {
      console.log("[CHAT] Connection established");
      setConnected(true);
      setConnecting(false);
      setMessageQueue((prev) => {
        prev.forEach((msg) => sendToAll(msg));
        return [];
      });
    };

    const handleDisconnect = () => {
      console.log("[CHAT] Connection lost");
      setConnected(false);
      setConnecting(false);
      setError(getConnectionErrorMessage({ type: 'disconnected' }));
    };

    const handleFallback = () => {
      setFallbackWarning(true);
    };

    const peer = await initPeer("", handleMessage, handleConnect, handleDisconnect, handleFallback);

    if (peer && peer.id) {
      console.log("[CHAT] Peer initialized with ID:", peer.id);
      setPeerId(peer.id);
      saveSession(peer.id);
      const link = `${window.location.origin}/chat?peer=${peer.id}`;
      setInviteLink(link);

      if (invitePeerId) {
        console.log("[CHAT] Connecting to invite:", invitePeerId);
        setConnecting(true);
        const validPeerId = await inviteManager.validateInvite(invitePeerId);
        connectToPeer(
          validPeerId || invitePeerId,
          handleMessage,
          handleConnect,
          handleDisconnect,
        );
      }
    }

    const handleVisibilityChange = () => {
      document.body.style.filter = document.hidden ? "blur(10px)" : "none";
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      destroy();
      clearSession();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    })();
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;

    const validation = validateMessage(input);
    if (!validation.valid) {
      setError(validation.error || "Invalid message");
      return;
    }

    if (!checkRateLimit("messages", 10, 10000)) {
      setError("Sending too fast. Wait a moment.");
      return;
    }

    storeMessage({ text: input, peerId, isSelf: true });
    setMessages([...getMessages()]);

    if (connected) {
      sendToAll(input);
    } else {
      setMessageQueue((prev) => [...prev, input]);
    }

    setInput("");
  };

  const handleRetry = () => {
    setError(null);
    window.location.reload();
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>


      <ErrorHandler
        error={error}
        onRetry={handleRetry}
        onDismiss={() => setError(null)}
      />
      {fallbackWarning && (
        <div style={{
          padding: 12,
          background: '#ff0',
          color: '#000',
          fontSize: 11,
          textAlign: 'center',
          borderBottom: '1px solid #333'
        }}>
          Custom server unavailable. Using free public server (0.peerjs.com)
          <button
            onClick={() => setFallbackWarning(false)}
            style={{
              marginLeft: 8,
              padding: '2px 8px',
              background: '#000',
              color: '#ff0',
              border: 'none',
              borderRadius: 4,
              fontSize: 10,
              cursor: 'pointer'
            }}
          >
            OK
          </button>
        </div>
      )}
      <div
        style={{
          padding: 16,
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            Your ID: {peerId.slice(0, 8)}...
          </div>
        </div>

      </div>
      <div style={{ padding: "0 16px 16px" }}>
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
        {showInvite && !connected && (
          <div style={{ marginTop: 12 }}>
            {!linkCreated ? (
              <button
                onClick={() => setLinkCreated(true)}
                disabled={!peerId}
                style={{
                  padding: "6px 12px",
                  background: peerId ? "#fff" : "#333",
                  border: "none",
                  borderRadius: 8,
                  color: peerId ? "#000" : "#666",
                  fontSize: 11,
                  cursor: peerId ? "pointer" : "not-allowed",
                  fontWeight: 600,
                }}
              >
                {peerId ? "Create Invite Link" : "Initializing..."}
              </button>
            ) : (
              <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                {inviteLink ? (
                  <>
                    <div style={{ marginBottom: 8, opacity: 0.8 }}>
                      Share this link with your friend:
                    </div>
                    <div
                      style={{
                        padding: 8,
                        background: "#1a1a1a",
                        borderRadius: 6,
                        wordBreak: "break-all",
                        fontSize: 10,
                        marginBottom: 8,
                        border: "1px solid #333",
                      }}
                    >
                      {inviteLink}
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: 8, opacity: 0.6, fontSize: 10 }}>
                    Generating link...
                  </div>
                )}
                {inviteLink && (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteLink);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        style={{
                          padding: '6px 12px',
                          background: copied ? '#0f0' : '#fff',
                          border: 'none',
                          borderRadius: 6,
                          color: copied ? '#000' : '#000',
                          fontSize: 10,
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        {copied ? 'Copied!' : 'Copy Link'}
                      </button>
                      <button
                        onClick={() => {
                          console.log('[QR] Toggle clicked, current:', showQR);
                          setShowQR(!showQR);
                        }}
                        style={{
                          padding: '6px 12px',
                          background: '#333',
                          border: 'none',
                          borderRadius: 6,
                          color: '#fff',
                          fontSize: 10,
                          cursor: 'pointer'
                        }}
                      >
                        {showQR ? 'Hide QR' : 'Show QR'}
                      </button>
                    </div>
                    {showQR && inviteLink && (
                      <div style={{ textAlign: 'center', marginBottom: 8 }}>
                        <img
                          src={generateQRCode(inviteLink)}
                          alt="QR Code"
                          style={{ maxWidth: '200px', border: '2px solid #333', borderRadius: 8 }}
                          onLoad={() => console.log('[QR] Image loaded')}
                          onError={(e) => console.error('[QR] Image failed:', e)}
                        />
                      </div>
                    )}
                  </>
                )}
                <div style={{ opacity: 0.6, fontSize: 10 }}>
                  They paste it in their browser or scan QR code
                </div>
                <div
                  style={{
                    opacity: 0.5,
                    fontSize: 9,
                    marginTop: 8,
                    color: "#ff0",
                  }}
                >
                  ⚠️ Link expires when you close this tab
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", opacity: 0.5, marginTop: 40 }}>
            No messages yet. Start chatting!
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              textAlign: msg.isSelf ? "right" : "left",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "8px 12px",
                background: msg.isSelf ? "#fff" : "#333",
                color: msg.isSelf ? "#000" : "#fff",
                borderRadius: 8,
                maxWidth: "70%",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: 16,
          borderTop: "1px solid #333",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && connected && sendMessage()}
          placeholder={
            connected ? "Type a message..." : "Waiting for connection..."
          }
          disabled={!connected}
          style={{
            flex: 1,
            padding: 12,
            background: connected ? "#fff" : "#111",
            border: "1px solid #333",
            borderRadius: 8,
            color: connected ? "#000" : "#666",
            outline: "none",
            cursor: connected ? "text" : "not-allowed",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!connected}
          style={{
            padding: "12px 24px",
            background: connected ? "#fff" : "#333",
            border: "none",
            borderRadius: 12,
            color: connected ? "#000" : "#666",
            cursor: connected ? "pointer" : "not-allowed",
            fontWeight: 600,
            boxShadow: connected ? "0 4px 20px rgba(255,255,255,0.1)" : "none",
          }}
        >
          Send
        </button>
      </div>
      <div
        style={{
          padding: "6px 12px",
          background: "#0a0a0a",
          borderTop: "1px solid #333",
          fontSize: 9,
          opacity: 0.7,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <span>
          Status: <span style={{ color: connected ? "#0f0" : connecting ? "#ff0" : "#f00" }}>
            {connected ? "Connected" : connecting ? "Connecting" : "Disconnected"}
          </span>
        </span>
        <span>ID: {peerId ? peerId.slice(0, 8) : "..."}</span>
        <span>Protocol: simple-peer</span>
        <span>Messages: {messages.length}</span>
        <span>Queue: {messageQueue.length}</span>
        {error && <span style={{ color: "#f00" }}>Error: {error.slice(0, 20)}...</span>}
        {fallbackWarning && <span style={{ color: "#ff0" }}>Fallback Mode</span>}
      </div>
    </div>
  );
}
